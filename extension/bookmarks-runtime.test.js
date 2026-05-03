'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// Mock the DOM
globalThis.document = {
  head: { appendChild: () => {} },
  createElement: () => ({ textContent: '' }),
  addEventListener: () => {},
  body: { classList: { add: () => {}, remove: () => {} } },
  elementFromPoint: () => null,
};

let renderCount = 0;
let lastRenderedId = null;

const mockContainer = {
  innerHTML: '',
  querySelector: () => null,
  querySelectorAll: () => [],
};

globalThis.document.getElementById = (id) => {
  if (id === 'bookmarksMissions') return mockContainer;
  return null;
};

// Global mocks
globalThis.window = globalThis;
globalThis.TabHarborI18n = { t: (k) => k };
globalThis.TabOutIconUtils = {};

// We need to keep a reference to the injected runtime logic
let runtime;

test.beforeEach(() => {
  // Reset mocks
  mockContainer.innerHTML = '';
  renderCount = 0;
  lastRenderedId = null;
  globalThis.chrome = {
    bookmarks: {
      getTree: (cb) => cb([{
        id: 'root',
        children: []
      }]),
      getSubTree: (id, cb) => cb([{ id, children: [] }]),
    },
    tabs: { create: () => {} },
    runtime: { lastError: null }
  };
});

test('TabHarborBookmarksRuntime.render() loads Bookmarks Bar automatically when found by ID "1"', async () => {
  globalThis.chrome.bookmarks.getTree = (cb) => {
    cb([{
      id: 'root',
      children: [
        { id: '1', title: 'Bookmarks Bar', children: [] },
        { id: '2', title: 'Other Bookmarks', children: [] }
      ]
    }]);
  };

  // Re-require to ensure clean state and pick up current chrome mock
  delete require.cache[require.resolve('./bookmarks-runtime.js')];
  require('./bookmarks-runtime.js');
  runtime = globalThis.TabHarborBookmarksRuntime;

  await runtime.render();

  // Wait for setTimeout in getTree mock resolving and renderView executing
  await new Promise(r => setTimeout(r, 0));

  // Verify that the breadcrumb trail has the Bookmarks Bar
  assert.match(mockContainer.innerHTML, /Bookmarks Bar/);
});

test('TabHarborBookmarksRuntime.render() loads Bookmarks Bar automatically when found by title', async () => {
  globalThis.chrome.bookmarks.getTree = (cb) => {
    cb([{
      id: 'root',
      children: [
        { id: '10', title: '书签栏', children: [] },
        { id: '11', title: '其他书签', children: [] }
      ]
    }]);
  };

  // Re-require
  delete require.cache[require.resolve('./bookmarks-runtime.js')];
  require('./bookmarks-runtime.js');
  runtime = globalThis.TabHarborBookmarksRuntime;

  await runtime.render();
  await new Promise(r => setTimeout(r, 0));

  assert.match(mockContainer.innerHTML, /书签栏/);
});

test('TabHarborBookmarksRuntime.render() falls back to root if Bookmarks Bar is not found', async () => {
  globalThis.chrome.bookmarks.getTree = (cb) => {
    cb([{
      id: 'root',
      children: [
        { id: '5', title: 'Custom Folder', children: [] },
        { id: '6', title: 'Mobile Bookmarks', children: [] }
      ]
    }]);
  };

  // Re-require
  delete require.cache[require.resolve('./bookmarks-runtime.js')];
  require('./bookmarks-runtime.js');
  runtime = globalThis.TabHarborBookmarksRuntime;

  await runtime.render();
  await new Promise(r => setTimeout(r, 0));

  // The root view renders the children of root
  assert.match(mockContainer.innerHTML, /Custom Folder/);
  assert.match(mockContainer.innerHTML, /Mobile Bookmarks/);
});
