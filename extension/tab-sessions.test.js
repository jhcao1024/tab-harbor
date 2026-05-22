'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSessionSnapshot,
  createSavedTabSessionFromTab,
  createRestoredSessionGroups,
  renameSavedTabSession,
  updateSavedTabSessionTabs,
  normalizeSavedTabSessions,
} = require('./tab-sessions.js');

test('buildSessionSnapshot captures selected tabs with canonical urls and manual group metadata', () => {
  const snapshot = buildSessionSnapshot({
    tabs: [
      {
        id: 11,
        url: 'extension://noogafoofpebimajpfpamcfhoaifemoa/suspended.html#ttl=Issue%20Thread&uri=https%3A%2F%2Fgithub.com%2FV-IOLE-T%2Ftab-harbor%2Fissues%2F25',
        title: 'Suspended tab',
        favIconUrl: 'https://github.com/favicon.ico',
        windowId: 1,
      },
      {
        id: 12,
        url: 'chrome://settings',
        title: 'Settings',
        windowId: 1,
      },
    ],
    groupLookup: new Map([
      ['11', { key: '__session_group__:research', label: 'Research', manualGroupId: 'research' }],
    ]),
    selectedTabIds: ['11', '12'],
    source: 'selected',
    now: '2026-05-22T08:00:00.000Z',
  });

  assert.equal(snapshot.tabs.length, 1);
  assert.equal(snapshot.tabs[0].url, 'https://github.com/V-IOLE-T/tab-harbor/issues/25');
  assert.equal(snapshot.tabs[0].title, 'Issue Thread');
  assert.deepEqual(snapshot.groups, [
    { key: '__session_group__:research', label: 'Research', manualGroupId: 'research', tabUrls: ['https://github.com/V-IOLE-T/tab-harbor/issues/25'] },
  ]);
});

test('buildSessionSnapshot rejects empty selected tabs', () => {
  assert.throws(
    () => buildSessionSnapshot({
      tabs: [{ id: 1, url: 'chrome://newtab/', title: 'New tab' }],
      selectedTabIds: ['1'],
    }),
    /no restorable tabs/i
  );
});

test('normalizeSavedTabSessions drops invalid sessions and tabs', () => {
  const sessions = normalizeSavedTabSessions([
    {
      id: 'session-a',
      name: 'Morning research',
      savedAt: '2026-05-22T08:00:00.000Z',
      tabs: [
        { url: 'https://example.com/a', title: 'A' },
        { url: 'chrome://settings', title: 'Settings' },
      ],
      groups: [{ key: 'example.com', label: 'Example', tabUrls: ['https://example.com/a', 'chrome://settings'] }],
    },
    { id: 'empty', tabs: [] },
  ]);

  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].name, 'Morning research');
  assert.deepEqual(sessions[0].groups[0].tabUrls, ['https://example.com/a']);
});

test('createRestoredSessionGroups creates manual groups for restored manual session groups', () => {
  const restored = createRestoredSessionGroups({
    existingState: { groups: [], assignments: {} },
    session: {
      groups: [{ key: '__session_group__:research', label: 'Research', manualGroupId: 'research', tabUrls: ['https://a.test', 'https://b.test'] }],
    },
    restoredTabs: [
      { id: 101, url: 'https://a.test' },
      { id: 102, url: 'https://b.test' },
    ],
    now: '2026-05-22T08:00:00.000Z',
  });

  assert.equal(restored.groups.length, 1);
  assert.equal(restored.groups[0].name, 'Research');
  assert.equal(restored.assignments['101'], restored.groups[0].id);
  assert.equal(restored.assignments['102'], restored.groups[0].id);
});

test('renameSavedTabSession updates the matching session name', async () => {
  const store = {
    savedTabSessions: [
      {
        id: 'session-a',
        name: 'Before',
        savedAt: '2026-05-22T08:00:00.000Z',
        source: 'manual',
        tabs: [{ url: 'https://example.com', title: 'Example' }],
        groups: [],
      },
    ],
  };
  global.chrome = {
    storage: {
      local: {
        async get(key) {
          return { [key]: store[key] };
        },
        async set(next) {
          Object.assign(store, next);
        },
      },
    },
  };

  const renamed = await renameSavedTabSession('session-a', 'After');
  assert.equal(renamed[0].name, 'After');
  assert.equal(store.savedTabSessions[0].name, 'After');
});

test('updateSavedTabSessionTabs reorders tabs and rebuilds groups', async () => {
  const store = {
    savedTabSessions: [
      {
        id: 'session-a',
        name: 'Session',
        savedAt: '2026-05-22T08:00:00.000Z',
        source: 'manual',
        tabs: [
          { url: 'https://a.test', title: 'A', groupKey: 'group-a', groupLabel: 'Group A' },
          { url: 'https://b.test', title: 'B', groupKey: 'group-b', groupLabel: 'Group B' },
        ],
        groups: [
          { key: 'group-a', label: 'Group A', manualGroupId: '', tabUrls: ['https://a.test'] },
          { key: 'group-b', label: 'Group B', manualGroupId: '', tabUrls: ['https://b.test'] },
        ],
      },
    ],
  };
  global.chrome = {
    storage: {
      local: {
        async get(key) {
          return { [key]: store[key] };
        },
        async set(next) {
          Object.assign(store, next);
        },
      },
    },
  };

  const updated = await updateSavedTabSessionTabs('session-a', [
    { url: 'https://b.test', title: 'B', groupKey: 'group-b', groupLabel: 'Group B' },
    { url: 'https://a.test', title: 'A', groupKey: 'group-a', groupLabel: 'Group A' },
  ]);
  assert.deepEqual(updated[0].tabs.map(tab => tab.url), ['https://b.test', 'https://a.test']);
  assert.deepEqual(updated[0].groups.map(group => group.key), ['group-b', 'group-a']);
});

test('updateSavedTabSessionTabs removes the session when no tabs remain', async () => {
  const store = {
    savedTabSessions: [
      {
        id: 'session-a',
        name: 'Session',
        savedAt: '2026-05-22T08:00:00.000Z',
        source: 'manual',
        tabs: [{ url: 'https://a.test', title: 'A' }],
        groups: [],
      },
    ],
  };
  global.chrome = {
    storage: {
      local: {
        async get(key) {
          return { [key]: store[key] };
        },
        async set(next) {
          Object.assign(store, next);
        },
      },
    },
  };

  const updated = await updateSavedTabSessionTabs('session-a', []);
  assert.equal(updated.length, 0);
});

test('createSavedTabSessionFromTab derives name, source, savedAt, tabs, and groups from one dragged tab', () => {
  const created = createSavedTabSessionFromTab({
    sourceSession: {
      id: 'session-a',
      name: 'Original',
      source: 'window',
    },
    tab: {
      url: 'https://github.com/openai/openai-node/issues/123',
      title: 'SDK issue - GitHub',
      favIconUrl: 'https://github.com/favicon.ico',
      groupKey: '__session_group__:bugs',
      groupLabel: 'Bugs',
      manualGroupId: 'bugs',
    },
    existingSessions: [],
    now: '2026-05-22T09:30:00.000Z',
  });

  assert.equal(created.name, 'SDK issue');
  assert.equal(created.source, 'window');
  assert.equal(created.savedAt, '2026-05-22T09:30:00.000Z');
  assert.equal(created.tabs.length, 1);
  assert.deepEqual(created.groups, [
    {
      key: '__session_group__:bugs',
      label: 'Bugs',
      manualGroupId: 'bugs',
      tabUrls: ['https://github.com/openai/openai-node/issues/123'],
    },
  ]);
});

test('createSavedTabSessionFromTab falls back to friendly domain and de-duplicates duplicate session names', () => {
  const created = createSavedTabSessionFromTab({
    sourceSession: {
      id: 'session-a',
      name: 'Original',
      source: '',
    },
    tab: {
      url: 'https://docs.github.com/en/actions',
      title: '',
      favIconUrl: '',
      groupKey: '',
      groupLabel: '',
      manualGroupId: '',
    },
    existingSessions: [
      {
        id: 'session-b',
        name: 'Docs',
        savedAt: '2026-05-22T08:00:00.000Z',
        source: 'manual',
        tabs: [{ url: 'https://example.com', title: 'Example' }],
        groups: [],
      },
    ],
    now: '2026-05-22T09:30:00.000Z',
  });

  assert.equal(created.name, 'Docs 2');
  assert.equal(created.source, 'manual');
});
