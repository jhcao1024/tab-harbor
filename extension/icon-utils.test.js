'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  escapeHtmlAttribute,
  getFallbackLabel,
  getPageOriginFaviconUrl,
  getGoogleFaviconUrl,
  getGroupIcon,
  getPrimaryDomain,
  getIconSources,
} = require('./icon-utils.js');

test('getIconSources prefers real favicon before domain fallback', () => {
  const iconData = getIconSources({
    favIconUrl: 'https://example.com/favicon.ico',
    url: 'https://www.example.com/page',
  }, 32);

  assert.equal(iconData.hostname, 'www.example.com');
  assert.equal(iconData.primaryDomain, 'example.com');
  assert.deepEqual(iconData.sources, [
    'https://example.com/favicon.ico',
    'https://www.example.com/favicon.ico',
    'https://www.google.com/s2/favicons?domain=example.com&sz=32',
    'https://www.google.com/s2/favicons?domain=www.example.com&sz=32',
  ]);
});

test('getGroupIcon falls back to google favicon when tab has no real favicon', () => {
  const iconData = getGroupIcon({
    tabs: [{ url: 'https://chatgpt.com/c/test' }],
  }, 'ChatGPT', 32);

  assert.equal(iconData.src, 'https://chatgpt.com/favicon.ico');
  assert.equal(iconData.fallbackSrc, 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=32');
  assert.equal(iconData.fallbackLabel, 'C');
});

test('getFallbackLabel derives stable initials from labels and hosts', () => {
  assert.equal(getFallbackLabel('GitHub Issues', 'github.com'), 'GI');
  assert.equal(getFallbackLabel('', 'www.wikipedia.org'), 'WI');
  assert.equal(getGoogleFaviconUrl('github.com', 16), 'https://www.google.com/s2/favicons?domain=github.com&sz=16');
  assert.equal(getPageOriginFaviconUrl('https://www.ict.ac.cn/yjsjy/zsxx/sszs/202605/t20260511_8199682.html'), 'https://www.ict.ac.cn/favicon.ico');
});

test('getPrimaryDomain collapses regular subdomains but preserves common hosted tenants', () => {
  assert.equal(getPrimaryDomain('foo.example.com'), 'example.com');
  assert.equal(getPrimaryDomain('foo.bar.example.co.uk'), 'example.co.uk');
  assert.equal(getPrimaryDomain('ict.ac.cn'), 'ict.ac.cn');
  assert.equal(getPrimaryDomain('myproject.github.io'), 'myproject.github.io');
  assert.equal(getPrimaryDomain('writer.substack.com'), 'writer.substack.com');
});

test('getIconSources skips unstable browser internal favicon urls', () => {
  const iconData = getIconSources({
    favIconUrl: 'chrome://favicon2/?pageUrl=https%3A%2F%2Fwww.ict.ac.cn',
    url: 'https://www.ict.ac.cn/yjsjy/zsxx/sszs/202605/t20260511_8199682.html',
  }, 32);

  assert.deepEqual(iconData.sources, [
    'https://www.ict.ac.cn/favicon.ico',
    'https://www.google.com/s2/favicons?domain=ict.ac.cn&sz=32',
    'https://www.google.com/s2/favicons?domain=www.ict.ac.cn&sz=32',
  ]);
});

test('escapeHtmlAttribute protects custom tooltip text', () => {
  assert.equal(
    escapeHtmlAttribute('ChatGPT "Projects" & Notes'),
    'ChatGPT &quot;Projects&quot; &amp; Notes'
  );
});
