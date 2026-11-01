'use strict';

// Behavioral tests for the new-tab focus redirect (extension/focus-redirect.js).
// The script redirects only after a fresh explicit opt-in and never loops.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const code = fs.readFileSync(path.join(__dirname, 'focus-redirect.js'), 'utf8');

function runRedirect({ search = '', pathname = '/index.html', hash = '', optIn = null }) {
  let replacedWith = null;
  const location = {
    search,
    pathname,
    hash,
    replace(target) {
      replacedWith = target;
    },
  };
  const fn = new Function('location', 'localStorage', code);
  fn(location, { getItem: key => key === 'portusAutoFocusSearchOptIn' ? optIn : '1' });
  return replacedWith;
}

test('focus-redirect: explicit opt-in redirects once and keeps the hash', () => {
  const target = runRedirect({ search: '', pathname: '/index.html', hash: '#x', optIn: '1' });
  assert.equal(target, '/index.html?focus=1#x');
});

test('focus-redirect: ?focus=1 already present → does nothing', () => {
  const target = runRedirect({ search: '?focus=1', pathname: '/index.html', hash: '', optIn: '1' });
  assert.equal(target, null);
});

test('focus-redirect: ?focus=1 with other params → does nothing', () => {
  const target = runRedirect({ search: '?a=1&focus=1', pathname: '/index.html', hash: '', optIn: '1' });
  assert.equal(target, null);
});

test('focus-redirect: default and legacy preferences keep the browser new-tab URL', () => {
  assert.equal(runRedirect({}), null);
  assert.equal(runRedirect({ optIn: '0' }), null);
});
