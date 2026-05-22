'use strict';

(function attachTabHarborTabSessions(globalScope) {
  const urlUtils = globalScope.TabHarborTabUrlUtils || (
    typeof require === 'function' ? require('./tab-url-utils.js') : {}
  );

  const {
    getCanonicalTabUrl: sessionsGetCanonicalTabUrl,
    isRestorableTabUrl: sessionsIsRestorableTabUrl,
    parseSuspendedTabUrl: sessionsParseSuspendedTabUrl,
  } = urlUtils;

  const SAVED_TAB_SESSIONS_KEY = 'savedTabSessions';
  const MANUAL_GROUP_PREFIX = '__session_group__:';

  function createSessionId(now = new Date()) {
    return `tab-session-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeString(value = '') {
    return String(value || '').trim();
  }

  function capitalizeLabel(value = '') {
    const cleanValue = normalizeString(value);
    if (!cleanValue) return '';
    return cleanValue.charAt(0).toUpperCase() + cleanValue.slice(1);
  }

  function getHostnameFromUrl(value = '') {
    try {
      return normalizeString(new URL(String(value || '')).hostname || '');
    } catch {
      return '';
    }
  }

  function getFriendlyHostnameLabel(hostname = '') {
    const cleanHostname = normalizeString(hostname).replace(/^www\./, '');
    if (!cleanHostname) return '';
    if (cleanHostname === 'github.com') return 'GitHub';
    if (cleanHostname === 'docs.github.com') return 'Docs';

    const parts = cleanHostname.split('.').filter(Boolean);
    if (parts.length >= 3) {
      return parts[0]
        .split(/[-_]/)
        .map(capitalizeLabel)
        .join(' ');
    }

    const base = (parts[0] || '')
      .replace(/\.(co\.uk|co\.jp|com|org|net|io|co|ai|dev|app|so|me|xyz|info|us|uk)$/, '');
    return base
      .split(/[-_]/)
      .map(capitalizeLabel)
      .join(' ');
  }

  function stripSessionTitleNoise(title = '') {
    return normalizeString(title)
      .replace(/^\(\d+\+?\)\s*/, '')
      .replace(/\s*\([\d,]+\+?\)\s*/g, ' ')
      .replace(/\s+on X:\s*/, ': ')
      .replace(/\s*\/\s*X\s*$/, '')
      .trim();
  }

  function cleanDerivedSessionTitle(title = '', hostname = '') {
    const cleanTitle = stripSessionTitleNoise(title);
    if (!cleanTitle) return '';
    if (cleanTitle.startsWith('http://') || cleanTitle.startsWith('https://')) return '';

    const domain = normalizeString(hostname).replace(/^www\./, '');
    const friendly = getFriendlyHostnameLabel(domain);
    const domainWithoutSuffix = domain.replace(/\.\w+$/, '');
    const separators = [' - ', ' | ', ' — ', ' · ', ' – '];

    for (const separator of separators) {
      const separatorIndex = cleanTitle.lastIndexOf(separator);
      if (separatorIndex === -1) continue;
      const suffix = cleanTitle.slice(separatorIndex + separator.length).trim().toLowerCase();
      if (
        suffix === domain.toLowerCase() ||
        suffix === friendly.toLowerCase() ||
        suffix === domainWithoutSuffix.toLowerCase()
      ) {
        const stripped = cleanTitle.slice(0, separatorIndex).trim();
        if (stripped.length >= 2) return stripped;
      }
    }

    return cleanTitle;
  }

  function normalizeSessionTab(input = {}) {
    const canonicalUrl = sessionsGetCanonicalTabUrl ? sessionsGetCanonicalTabUrl(input.url || '') : normalizeString(input.url);
    if (!canonicalUrl || !(sessionsIsRestorableTabUrl ? sessionsIsRestorableTabUrl(canonicalUrl) : true)) return null;

    return {
      url: canonicalUrl,
      title: normalizeString(input.title) || canonicalUrl,
      favIconUrl: normalizeString(input.favIconUrl),
      groupKey: normalizeString(input.groupKey),
      groupLabel: normalizeString(input.groupLabel),
      manualGroupId: normalizeString(input.manualGroupId),
    };
  }

  function normalizeSessionGroup(input = {}, validUrls = new Set()) {
    const key = normalizeString(input.key);
    if (!key) return null;
    const tabUrls = Array.isArray(input.tabUrls)
      ? input.tabUrls
        .map(url => sessionsGetCanonicalTabUrl ? sessionsGetCanonicalTabUrl(url) : normalizeString(url))
        .filter(url => url && validUrls.has(url))
      : [];
    if (!tabUrls.length) return null;

    return {
      key,
      label: normalizeString(input.label) || 'Group',
      manualGroupId: normalizeString(input.manualGroupId),
      tabUrls: [...new Set(tabUrls)],
    };
  }

  function normalizeSavedTabSessions(input) {
    if (!Array.isArray(input)) return [];

    return input
      .map(session => {
        const tabs = Array.isArray(session?.tabs)
          ? session.tabs.map(normalizeSessionTab).filter(Boolean)
          : [];
        if (!tabs.length) return null;

        const validUrls = new Set(tabs.map(tab => tab.url));
        const groups = Array.isArray(session?.groups)
          ? session.groups.map(group => normalizeSessionGroup(group, validUrls)).filter(Boolean)
          : [];

        return {
          id: normalizeString(session.id) || createSessionId(),
          name: normalizeString(session.name) || 'Saved tabs',
          savedAt: normalizeString(session.savedAt) || new Date().toISOString(),
          source: normalizeString(session.source) || 'manual',
          tabs,
          groups,
        };
      })
      .filter(Boolean);
  }

  function buildSessionGroupsFromTabs(tabs = []) {
    const groupMap = new Map();

    for (const tab of Array.isArray(tabs) ? tabs : []) {
      const key = normalizeString(tab?.groupKey);
      if (!key) continue;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          key,
          label: normalizeString(tab?.groupLabel) || 'Group',
          manualGroupId: normalizeString(tab?.manualGroupId),
          tabUrls: [],
        });
      }
      const group = groupMap.get(key);
      if (!group.tabUrls.includes(tab.url)) group.tabUrls.push(tab.url);
    }

    return [...groupMap.values()];
  }

  function createUniqueSavedTabSessionName(baseName, sessions = [], excludeSessionId = '') {
    const fallbackName = normalizeString(baseName) || 'Saved tabs';
    const lowerFallback = fallbackName.toLowerCase();
    const takenNames = new Set(
      (Array.isArray(sessions) ? sessions : [])
        .filter(session => String(session?.id || '') !== String(excludeSessionId || ''))
        .map(session => normalizeString(session?.name).toLowerCase())
        .filter(Boolean)
    );

    if (!takenNames.has(lowerFallback)) return fallbackName;

    let suffix = 2;
    while (takenNames.has(`${lowerFallback} ${suffix}`)) suffix += 1;
    return `${fallbackName} ${suffix}`;
  }

  function deriveSavedTabSessionName(tab = {}) {
    const hostname = getHostnameFromUrl(tab?.url || '');
    const title = cleanDerivedSessionTitle(tab?.title || '', hostname);
    if (title) return title;

    return getFriendlyHostnameLabel(hostname) || 'Saved tabs';
  }

  function createSavedTabSessionFromTab({
    sourceSession = {},
    tab = {},
    existingSessions = [],
    now = new Date().toISOString(),
  } = {}) {
    const normalizedTab = normalizeSessionTab(tab);
    if (!normalizedTab) throw new Error('Dragged tab is not restorable');

    const savedAt = normalizeString(now) || new Date().toISOString();
    const baseName = deriveSavedTabSessionName({
      ...tab,
      ...normalizedTab,
    });

    return {
      id: createSessionId(new Date(savedAt)),
      name: createUniqueSavedTabSessionName(baseName, existingSessions),
      savedAt,
      source: normalizeString(sourceSession?.source) || 'manual',
      tabs: [normalizedTab],
      groups: buildSessionGroupsFromTabs([normalizedTab]),
    };
  }

  function getTabId(tab = {}) {
    return tab?.id == null ? '' : String(tab.id);
  }

  function getTabTitle(tab = {}, canonicalUrl = '') {
    const suspended = sessionsParseSuspendedTabUrl
      ? sessionsParseSuspendedTabUrl(tab.url || '')
      : { title: '' };
    return normalizeString(suspended.title) || normalizeString(tab.title) || canonicalUrl;
  }

  function normalizeGroupLookupEntry(entry = {}) {
    if (!entry || typeof entry !== 'object') return null;
    const key = normalizeString(entry.key);
    if (!key) return null;
    return {
      key,
      label: normalizeString(entry.label) || 'Group',
      manualGroupId: normalizeString(entry.manualGroupId),
    };
  }

  function buildSessionSnapshot({
    tabs = [],
    groupLookup = new Map(),
    selectedTabIds = null,
    source = 'manual',
    name = '',
    now = new Date().toISOString(),
  } = {}) {
    const selectedIds = Array.isArray(selectedTabIds)
      ? new Set(selectedTabIds.map(String))
      : null;
    const savedAt = normalizeString(now) || new Date().toISOString();

    const savedTabs = [];
    const groupMap = new Map();

    for (const tab of Array.isArray(tabs) ? tabs : []) {
      const tabId = getTabId(tab);
      if (selectedIds && !selectedIds.has(tabId)) continue;

      const canonicalUrl = sessionsGetCanonicalTabUrl ? sessionsGetCanonicalTabUrl(tab?.url || '') : normalizeString(tab?.url);
      if (!canonicalUrl || !(sessionsIsRestorableTabUrl ? sessionsIsRestorableTabUrl(canonicalUrl) : true)) continue;

      const lookupEntry = typeof groupLookup?.get === 'function'
        ? normalizeGroupLookupEntry(groupLookup.get(tabId) || groupLookup.get(canonicalUrl))
        : null;
      const savedTab = {
        url: canonicalUrl,
        title: getTabTitle(tab, canonicalUrl),
        favIconUrl: normalizeString(tab?.favIconUrl),
        groupKey: lookupEntry?.key || '',
        groupLabel: lookupEntry?.label || '',
        manualGroupId: lookupEntry?.manualGroupId || '',
      };

      savedTabs.push(savedTab);

      if (lookupEntry) {
        if (!groupMap.has(lookupEntry.key)) {
          groupMap.set(lookupEntry.key, {
            key: lookupEntry.key,
            label: lookupEntry.label,
            manualGroupId: lookupEntry.manualGroupId,
            tabUrls: [],
          });
        }
        groupMap.get(lookupEntry.key).tabUrls.push(canonicalUrl);
      }
    }

    if (!savedTabs.length) {
      throw new Error('No restorable tabs selected');
    }

    const groups = [...groupMap.values()].map(group => ({
      ...group,
      tabUrls: [...new Set(group.tabUrls)],
    }));

    return {
      id: createSessionId(new Date(savedAt)),
      name: normalizeString(name) || `Saved tabs ${new Date(savedAt).toLocaleString()}`,
      savedAt,
      source: normalizeString(source) || 'manual',
      tabs: savedTabs,
      groups,
    };
  }

  function createRestoredSessionGroups({
    existingState = { groups: [], assignments: {} },
    session = {},
    restoredTabs = [],
    now = new Date().toISOString(),
  } = {}) {
    const normalizedState = {
      groups: Array.isArray(existingState?.groups) ? existingState.groups.slice() : [],
      assignments: existingState?.assignments && typeof existingState.assignments === 'object'
        ? { ...existingState.assignments }
        : {},
    };
    const restoredByUrl = new Map();
    for (const tab of Array.isArray(restoredTabs) ? restoredTabs : []) {
      const canonicalUrl = sessionsGetCanonicalTabUrl ? sessionsGetCanonicalTabUrl(tab?.url || '') : normalizeString(tab?.url);
      if (!canonicalUrl || tab?.id == null) continue;
      if (!restoredByUrl.has(canonicalUrl)) restoredByUrl.set(canonicalUrl, []);
      restoredByUrl.get(canonicalUrl).push(String(tab.id));
    }

    const sessionGroups = Array.isArray(session?.groups) ? session.groups : [];
    sessionGroups
      .filter(group => normalizeString(group?.key).startsWith(MANUAL_GROUP_PREFIX))
      .forEach((group, index) => {
        const groupName = normalizeString(group.label) || 'Restored group';
        const groupId = `restored-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
        normalizedState.groups.push({
          id: groupId,
          name: groupName,
          createdAt: normalizeString(now) || new Date().toISOString(),
        });

        for (const url of Array.isArray(group.tabUrls) ? group.tabUrls : []) {
          const tabIds = restoredByUrl.get(url) || [];
          const tabId = tabIds.shift();
          if (tabId) normalizedState.assignments[tabId] = groupId;
        }
      });

    return normalizedState;
  }

  async function getSavedTabSessions() {
    const stored = await chrome.storage.local.get(SAVED_TAB_SESSIONS_KEY);
    return normalizeSavedTabSessions(stored[SAVED_TAB_SESSIONS_KEY]);
  }

  async function saveSavedTabSessions(sessions) {
    const normalized = normalizeSavedTabSessions(sessions);
    await chrome.storage.local.set({ [SAVED_TAB_SESSIONS_KEY]: normalized });
    return normalized;
  }

  async function addSavedTabSession(session) {
    const sessions = await getSavedTabSessions();
    const normalized = normalizeSavedTabSessions([session])[0];
    if (!normalized) throw new Error('No restorable tabs selected');
    return saveSavedTabSessions([normalized, ...sessions]);
  }

  async function deleteSavedTabSession(sessionId) {
    const targetId = normalizeString(sessionId);
    const sessions = await getSavedTabSessions();
    return saveSavedTabSessions(sessions.filter(session => session.id !== targetId));
  }

  async function renameSavedTabSession(sessionId, nextName) {
    const targetId = normalizeString(sessionId);
    const cleanName = normalizeString(nextName);
    const sessions = await getSavedTabSessions();
    return saveSavedTabSessions(sessions.map(session => {
      if (session.id !== targetId) return session;
      return {
        ...session,
        name: cleanName || session.name,
      };
    }));
  }

  async function updateSavedTabSessionTabs(sessionId, nextTabs) {
    const targetId = normalizeString(sessionId);
    const normalizedTabs = Array.isArray(nextTabs)
      ? nextTabs.map(normalizeSessionTab).filter(Boolean)
      : [];
    const sessions = await getSavedTabSessions();
    const nextSessions = [];

    for (const session of sessions) {
      if (session.id !== targetId) {
        nextSessions.push(session);
        continue;
      }

      if (!normalizedTabs.length) continue;

      nextSessions.push({
        ...session,
        tabs: normalizedTabs,
        groups: buildSessionGroupsFromTabs(normalizedTabs),
      });
    }

    return saveSavedTabSessions(nextSessions);
  }

  const api = {
    SAVED_TAB_SESSIONS_KEY,
    buildSessionSnapshot,
    buildSessionGroupsFromTabs,
    createSavedTabSessionFromTab,
    createRestoredSessionGroups,
    deleteSavedTabSession,
    getSavedTabSessions,
    addSavedTabSession,
    renameSavedTabSession,
    updateSavedTabSessionTabs,
    normalizeSavedTabSessions,
    saveSavedTabSessions,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.TabHarborTabSessions = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
