'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SAVED_TAB_SESSION_COLLAPSED_KEY,
  SAVED_TAB_SESSION_ORDER_KEY,
  applySavedTabSessionOrder,
  detachSavedSessionTabToNewSession,
  buildSavedSessionTabToken,
  buildSavedTabSessionOrder,
  buildSavedTabSessionOrderWithInsertedSession,
  moveSavedSessionTabsByTokens,
  normalizeSavedTabSessionCollapsedState,
  normalizeSavedTabSessionOrder,
  parseSavedSessionTabToken,
  reorderSavedSessionTabsByTokens,
} = require('./session-manager.js');

test('session manager exposes the saved session order storage key', () => {
  assert.equal(SAVED_TAB_SESSION_ORDER_KEY, 'savedTabSessionOrder');
});

test('session manager exposes the saved session collapsed storage key', () => {
  assert.equal(SAVED_TAB_SESSION_COLLAPSED_KEY, 'savedTabSessionCollapsedState');
});

test('normalizeSavedTabSessionOrder keeps unique non-empty ids in order', () => {
  assert.deepEqual(
    normalizeSavedTabSessionOrder(['session-a', '', null, 'session-b', 'session-a']),
    ['session-a', 'session-b']
  );
});

test('normalizeSavedTabSessionCollapsedState keeps only explicit true flags for known sessions', () => {
  assert.deepEqual(
    normalizeSavedTabSessionCollapsedState(
      {
        'session-a': true,
        'session-b': false,
        '': true,
        'session-c': 'yes',
      },
      [
        { id: 'session-a' },
        { id: 'session-b' },
      ]
    ),
    { 'session-a': true }
  );
});

test('applySavedTabSessionOrder sorts sessions by persisted ids and appends new ones', () => {
  const ordered = applySavedTabSessionOrder(
    [
      { id: 'session-c', name: 'C' },
      { id: 'session-a', name: 'A' },
      { id: 'session-b', name: 'B' },
    ],
    ['session-b', 'session-a']
  );

  assert.deepEqual(
    ordered.map(session => session.id),
    ['session-b', 'session-a', 'session-c']
  );
});

test('buildSavedTabSessionOrder reflects the current ordered session ids', () => {
  assert.deepEqual(
    buildSavedTabSessionOrder([
      { id: 'session-b' },
      { id: 'session-a' },
      { id: 'session-b' },
    ]),
    ['session-b', 'session-a']
  );
});

test('saved session tab tokens round-trip session id and index', () => {
  const token = buildSavedSessionTabToken('session-a', 2);
  assert.equal(token, 'session-a::2');
  assert.deepEqual(parseSavedSessionTabToken(token), { sessionId: 'session-a', tabIndex: 2 });
});

test('reorderSavedSessionTabsByTokens reorders tabs within one session', () => {
  const reordered = reorderSavedSessionTabsByTokens(
    {
      id: 'session-a',
      tabs: [{ title: 'A' }, { title: 'B' }, { title: 'C' }],
    },
    ['session-a::2', 'session-a::0', 'session-a::1']
  );

  assert.deepEqual(reordered.map(tab => tab.title), ['C', 'A', 'B']);
});

test('moveSavedSessionTabsByTokens preserves target tabs when moving across sessions', () => {
  const moved = moveSavedSessionTabsByTokens({
    sourceSession: {
      id: 'session-a',
      tabs: [{ title: 'A' }, { title: 'A2' }],
    },
    targetSession: {
      id: 'session-b',
      tabs: [{ title: 'B' }],
    },
    sourceOrderTokens: ['session-a::1'],
    targetOrderTokens: ['session-a::0', 'session-b::0'],
    draggedToken: 'session-a::0',
  });

  assert.deepEqual(moved.sourceTabs.map(tab => tab.title), ['A2']);
  assert.deepEqual(moved.targetTabs.map(tab => tab.title), ['A', 'B']);
});

test('buildSavedTabSessionOrderWithInsertedSession inserts new sessions at the top, bottom, or before a gap target', () => {
  const sessions = [
    { id: 'session-a', name: 'A' },
    { id: 'session-b', name: 'B' },
    { id: 'session-c', name: 'C' },
  ];

  assert.deepEqual(
    buildSavedTabSessionOrderWithInsertedSession(sessions, 'session-new', {
      placement: 'before',
    }),
    ['session-new', 'session-a', 'session-b', 'session-c']
  );

  assert.deepEqual(
    buildSavedTabSessionOrderWithInsertedSession(sessions, 'session-new', {
      placement: 'after',
    }),
    ['session-a', 'session-b', 'session-c', 'session-new']
  );

  assert.deepEqual(
    buildSavedTabSessionOrderWithInsertedSession(sessions, 'session-new', {
      placement: 'before',
      insertBeforeSessionId: 'session-c',
    }),
    ['session-a', 'session-b', 'session-new', 'session-c']
  );
});

test('detachSavedSessionTabToNewSession inserts a new middle session and rebuilds the source tabs/groups', () => {
  const result = detachSavedSessionTabToNewSession({
    sessions: [
      {
        id: 'session-a',
        name: 'Morning',
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
      {
        id: 'session-c',
        name: 'Later',
        savedAt: '2026-05-22T08:10:00.000Z',
        source: 'manual',
        tabs: [{ url: 'https://c.test', title: 'C' }],
        groups: [],
      },
    ],
    draggedToken: 'session-a::1',
    placement: 'before',
    insertBeforeSessionId: 'session-c',
    now: '2026-05-22T09:30:00.000Z',
  });

  assert.deepEqual(result.orderIds, [
    'session-a',
    result.createdSession.id,
    'session-c',
  ]);
  assert.deepEqual(result.sessions[0].tabs.map(tab => tab.url), ['https://a.test']);
  assert.deepEqual(result.sessions[0].groups.map(group => group.key), ['group-a']);
  assert.equal(result.createdSession.name, 'B');
  assert.deepEqual(result.createdSession.tabs.map(tab => tab.url), ['https://b.test']);
});

test('detachSavedSessionTabToNewSession deletes the source session when its last tab is moved out', () => {
  const result = detachSavedSessionTabToNewSession({
    sessions: [
      {
        id: 'session-a',
        name: 'Solo',
        savedAt: '2026-05-22T08:00:00.000Z',
        source: 'manual',
        tabs: [{ url: 'https://solo.test', title: 'Solo' }],
        groups: [],
      },
      {
        id: 'session-b',
        name: 'Next',
        savedAt: '2026-05-22T08:10:00.000Z',
        source: 'manual',
        tabs: [{ url: 'https://next.test', title: 'Next' }],
        groups: [],
      },
    ],
    draggedToken: 'session-a::0',
    placement: 'before',
    insertBeforeSessionId: 'session-b',
    now: '2026-05-22T09:30:00.000Z',
  });

  assert.equal(result.sourceSessionRemoved, true);
  assert.deepEqual(
    result.sessions.map(session => session.id),
    [result.createdSession.id, 'session-b']
  );
});
