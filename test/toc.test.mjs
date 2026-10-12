/**
 * toc.ts の単体テスト。
 *
 * 深さフィルタと h2 > h3 の入れ子編みは、目次の表示構造を直接決める。
 * (content.enableToc の判定は呼び出し側の責務なのでここでは触れない)
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTocTree, collectTocHeadings } from '../src/lib/toc.ts';

const h = (depth, slug) => ({ depth, slug, text: `見出し ${slug}` });

test('collectTocHeadings: h2 / h3 だけを残す', () => {
  const result = collectTocHeadings([h(1, 'h1'), h(2, 'a'), h(3, 'b'), h(4, 'c')]);
  assert.deepEqual(
    result.map((heading) => heading.slug),
    ['a', 'b'],
    'h1 と h4 は目次に載せない',
  );
});

test('collectTocHeadings: 対象が1つも無ければ空配列', () => {
  assert.deepEqual(collectTocHeadings([]), []);
  assert.deepEqual(collectTocHeadings([h(1, 'only-h1')]), []);
});

test('collectTocHeadings: 入力を書き換えず元の順序を保つ', () => {
  const input = [h(3, 'first'), h(2, 'second'), h(2, 'third')];
  const result = collectTocHeadings(input);
  assert.deepEqual(
    result.map((heading) => heading.slug),
    ['first', 'second', 'third'],
    '並び替えはしない',
  );
  assert.equal(input.length, 3, '入力配列は変更しない');
});

test('buildTocTree: h3 は直前より前の直近の h2 の子になる', () => {
  const tree = buildTocTree([h(2, 'a'), h(3, 'a-1'), h(3, 'a-2'), h(2, 'b'), h(3, 'b-1')]);
  assert.deepEqual(
    tree.map((node) => node.slug),
    ['a', 'b'],
    'ルートは h2 のみ',
  );
  assert.deepEqual(
    tree[0].children.map((node) => node.slug),
    ['a-1', 'a-2'],
  );
  assert.deepEqual(
    tree[1].children.map((node) => node.slug),
    ['b-1'],
  );
});

test('buildTocTree: 先頭の h3 (h2 の前) はルートに置かれる', () => {
  const tree = buildTocTree([h(3, 'orphan'), h(2, 'after')]);
  assert.deepEqual(
    tree.map((node) => node.slug),
    ['orphan', 'after'],
    'h2 が来るまで子にできないためルートへ',
  );
  assert.equal(tree[0].children.length, 0);
});

test('buildTocTree: 見出しが無ければ空ツリー', () => {
  assert.deepEqual(buildTocTree([]), []);
});
