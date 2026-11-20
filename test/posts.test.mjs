/**
 * posts.ts の単体テスト。
 *
 * 一覧・OGP に使う抜粋が、文字の途中で切れないことを固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { getPostDescription } from '../src/lib/posts.ts';

/** getPostDescription が読むフィールドだけを持つ記事 */
const post = (body, description) => ({ data: { description }, body });

test('getPostDescription: description があればそのまま返す', () => {
  assert.equal(getPostDescription(post('本文', '説明')), '説明');
});

test('getPostDescription: 本文を上限で切って … を付ける', () => {
  assert.equal(getPostDescription(post('あいうえお'), 3), 'あいう…');
  assert.equal(getPostDescription(post('あいう'), 3), 'あいう');
});

test('getPostDescription: サロゲートペアの途中で切らない', () => {
  const description = getPostDescription(post(`${'a'.repeat(149)}😀xyz`));
  assert.equal(description, `${'a'.repeat(149)}😀…`);
  assert.equal(description.isWellFormed(), true);
});
