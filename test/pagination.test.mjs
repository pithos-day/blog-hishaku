/**
 * pagination.ts の単体テスト。
 *
 * 1 ページ目の複数 URL・2 ページ目の prev=/・最終ページの next なしといった
 * ページ境界はリンクが壊れると直結するため、境界値を固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPostPage, calcLastPage, POSTS_PAGE_SIZE } from '../src/lib/pagination.ts';

/** 記事の代わりに連番配列を使う (この関数は length と slice しか見ない) */
const posts = (count) => Array.from({ length: count }, (_, i) => ({ index: i }));

test('calcLastPage: 0件でも1ページ、件数は切り上げ', () => {
  assert.equal(calcLastPage(0), 1, '記事が無くても 1 ページ目は存在する');
  assert.equal(calcLastPage(1), 1);
  assert.equal(calcLastPage(POSTS_PAGE_SIZE), 1, '定数ちょうどは切り上げない');
  assert.equal(calcLastPage(POSTS_PAGE_SIZE + 1), 2);
  assert.equal(calcLastPage(POSTS_PAGE_SIZE * 2), 2);
  assert.equal(calcLastPage(POSTS_PAGE_SIZE * 2 + 1), 3);
  assert.equal(calcLastPage(5, 2), 3, 'ページサイズ指定で端数切り上げ');
});

test('buildPostPage: 1ページ目は / が current で prev/first は無い', () => {
  const page = buildPostPage(posts(25), 1);
  assert.equal(page.currentPage, 1);
  assert.equal(page.lastPage, 3);
  assert.equal(page.total, 25);
  assert.equal(page.size, POSTS_PAGE_SIZE);
  assert.equal(page.start, 0);
  assert.equal(page.end, 10);
  assert.equal(page.data.length, 10, '先頭 10 件');
  assert.equal(page.url.current, '/');
  assert.equal(page.url.prev, undefined, '1ページ目の前にページは無い');
  assert.equal(page.url.first, undefined, '既に先頭');
  assert.equal(page.url.next, '/posts/2/');
  assert.equal(page.url.last, '/posts/3/');
});

test('buildPostPage: 2ページ目の prev は / に戻る', () => {
  const page = buildPostPage(posts(25), 2);
  assert.equal(page.url.current, '/posts/2/');
  assert.equal(page.url.prev, '/', '2ページ目だけは / に戻る (従来の /1 は無い)');
  assert.equal(page.url.first, '/');
  assert.equal(page.url.next, '/posts/3/');
  assert.equal(page.start, 10);
  assert.equal(page.end, 20);
});

test('buildPostPage: 3ページ目以降の prev は /posts/{N-1}/', () => {
  const page = buildPostPage(posts(35), 3);
  assert.equal(page.url.prev, '/posts/2/');
  assert.equal(page.url.next, '/posts/4/');
});

test('buildPostPage: 最終ページは next/last が無く data は残りだけ', () => {
  const all = posts(25);
  const page = buildPostPage(all, 3);
  assert.equal(page.url.next, undefined, '最終ページの次は無い');
  assert.equal(page.url.last, undefined, '既に最終');
  assert.equal(page.start, 20);
  assert.equal(page.end, 25);
  assert.deepEqual(page.data, all.slice(20), '残り 5 件だけ');
});

test('buildPostPage: 記事が無くても 1 ページ構造は返す', () => {
  const page = buildPostPage([], 1);
  assert.equal(page.total, 0);
  assert.equal(page.lastPage, 1);
  assert.equal(page.data.length, 0);
  assert.equal(page.url.current, '/');
  assert.equal(page.url.next, undefined);
  assert.equal(page.url.prev, undefined);
});
