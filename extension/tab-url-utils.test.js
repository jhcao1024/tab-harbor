'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getCanonicalTabUrl,
  isRestorableTabUrl,
  parseSuspendedTabUrl,
} = require('./tab-url-utils.js');

test('parseSuspendedTabUrl extracts original uri and title from Marvellous Suspender URLs', () => {
  const suspendedUrl = 'extension://noogafoofpebimajpfpamcfhoaifemoa/suspended.html#ttl=V-IOLE-T%2Ftab-harbor&pos=0&uri=https%3A%2F%2Fgithub.com%2FV-IOLE-T%2Ftab-harbor';

  const parsed = parseSuspendedTabUrl(suspendedUrl);

  assert.equal(parsed.isSuspended, true);
  assert.equal(parsed.originalUrl, 'https://github.com/V-IOLE-T/tab-harbor');
  assert.equal(parsed.title, 'V-IOLE-T/tab-harbor');
});

test('getCanonicalTabUrl leaves ordinary urls alone and unwraps suspended urls', () => {
  assert.equal(
    getCanonicalTabUrl('https://example.com/docs'),
    'https://example.com/docs'
  );
  assert.equal(
    getCanonicalTabUrl('extension://noogafoofpebimajpfpamcfhoaifemoa/suspended.html#ttl=Docs&uri=https%3A%2F%2Fexample.com%2Fdocs'),
    'https://example.com/docs'
  );
});

test('isRestorableTabUrl rejects browser internals and unsafe protocols', () => {
  assert.equal(isRestorableTabUrl('https://example.com'), true);
  assert.equal(isRestorableTabUrl('http://example.com'), true);
  assert.equal(isRestorableTabUrl('file:///Users/test/report.pdf'), true);
  assert.equal(isRestorableTabUrl('chrome://settings'), false);
  assert.equal(isRestorableTabUrl('about:blank'), false);
  assert.equal(isRestorableTabUrl('javascript:alert(1)'), false);
});

test('parseSuspendedTabUrl tolerates malformed suspended hashes', () => {
  const parsed = parseSuspendedTabUrl('extension://noogafoofpebimajpfpamcfhoaifemoa/suspended.html#ttl=OnlyTitle');

  assert.equal(parsed.isSuspended, true);
  assert.equal(parsed.originalUrl, '');
  assert.equal(parsed.title, 'OnlyTitle');
});

test('parseSuspendedTabUrl only unwraps extension suspended pages', () => {
  const ordinaryPage = 'https://example.com/suspended.html#ttl=Docs&uri=https%3A%2F%2Fother.test';
  const parsed = parseSuspendedTabUrl(ordinaryPage);

  assert.equal(parsed.isSuspended, false);
  assert.equal(getCanonicalTabUrl(ordinaryPage), ordinaryPage);
});
