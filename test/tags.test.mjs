/**
 * tags.ts の純粋ヘルパの単体テスト。
 *
 * タグは英字の大文字小文字ゆれと日本語が混在する。
 * スラッグ化の規則 (小文字化のみ・日本語は無変換) と URL 生成を固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTagHref, tagToSlug } from '../src/lib/tags.ts';

test('tagToSlug: 英字タグは小文字化する', () => {
  assert.equal(tagToSlug('Astro'), 'astro');
  assert.equal(tagToSlug('ASTRO'), 'astro');
  assert.equal(tagToSlug('already-lower'), 'already-lower');
});

test('tagToSlug: 日本語タグは無変換でそのまま通す', () => {
  assert.equal(tagToSlug('日記'), '日記');
});

test('buildTagHref: 前後を /tags/ で挟み末尾スラッシュを付ける', () => {
  assert.equal(buildTagHref('Astro'), '/tags/astro/');
  assert.equal(
    buildTagHref('日記'),
    `/tags/${encodeURIComponent('日記')}/`,
    '日本語タグはエンコードされる',
  );
});
