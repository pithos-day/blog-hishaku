/**
 * categories.ts の純粋ヘルパの単体テスト。
 *
 * frontmatter の categories は Hexo 互換で 2 形式あり、URL は categoryMap と
 * エンコードを通る。表記ゆれや日本語名が壊れるとリンクが 404 になるため固定する。
 * categoryMap は site.yaml ではなく自前のマップを渡す (フォーク先の設定変更に
 * 随従してテストが落ちないため)。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCategoryHref,
  buildCategorySlugPath,
  normalizeCategories,
} from '../src/lib/categories.ts';

/** テスト専用の categoryMap (site.yaml には依存しない) */
const categoryMap = { ライフ: 'life', ノート: 'note' };

test('normalizeCategories: 未指定・空配列は空のまま', () => {
  assert.deepEqual(normalizeCategories(undefined), []);
  assert.deepEqual(normalizeCategories([]), []);
});

test('normalizeCategories: 平坦な配列は 1 本の階層チェーン (Hexo 互換)', () => {
  assert.deepEqual(normalizeCategories(['ライフ', 'ノート']), [['ライフ', 'ノート']]);
});

test('normalizeCategories: 入れ子配列は複数チェーンとしてそのまま通す', () => {
  const chains = [['ライフ'], ['ノート', '日記']];
  assert.deepEqual(normalizeCategories(chains), chains);
});

test('buildCategorySlugPath: categoryMap に登録された名前はスラッグに置換する', () => {
  assert.equal(
    buildCategorySlugPath(['ノート', 'Astro'], categoryMap),
    'note/Astro',
    '登録名 (ノート → note) だけ置換され未登録名はそのまま',
  );
});

test('buildCategorySlugPath: 未登録の名前はそのまま連結する', () => {
  assert.equal(buildCategorySlugPath(['未登録カテゴリ'], categoryMap), '未登録カテゴリ');
  assert.equal(buildCategorySlugPath([], categoryMap), '', '空のチェーンは空文字');
});

test('buildCategoryHref: 前後のスラッシュを付けつつ各セグメントをエンコードする', () => {
  assert.equal(buildCategoryHref(['ノート'], categoryMap), '/categories/note/');
  assert.equal(
    buildCategoryHref(['ライフ', 'コーヒー'], categoryMap),
    `/categories/life/${encodeURIComponent('コーヒー')}/`,
    '日本語セグメントはエンコードされる',
  );
});
