/**
 * preprocessShokaMarkdown の黄金テスト。
 *
 * 期待値は実際の出力をレビューのうえ固定したもの。リファクタリング時に
 * 前処理の出力が壊れないことを node --test で確認する。
 * 前処理は Markdown レンダリング前に走るため、通常の段落は生テキストのまま
 * 残る (構文の断片を除き HTML タグはブロック構文が生成したものだけ)。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { preprocessShokaMarkdown as p } from '../src/lib/markdown/preprocessor.ts';

test('preprocessShokaMarkdown: :::note ブロックを div とアイコンに変換', () => {
  const actual = p(':::note\n本文\n:::').trim();
  assert.match(actual, /^<div class="note-block note-note">/);
  assert.match(actual, /<svg class="note-icon note-icon-note"/);
  assert.match(actual, /本文/);
  assert.match(actual, /<\/div>$/);
});

test('preprocessShokaMarkdown: no-icon 指定でアイコンを省略', () => {
  const actual = p(':::info no-icon\n本文\n:::').trim();
  assert.match(actual, /^<div class="note-block note-info no-icon">/);
  assert.doesNotMatch(actual, /<svg/);
});

test('preprocessShokaMarkdown: +++style Title を details 要素に変換', () => {
  const actual = p('+++success タイトル\n中身\n+++').trim();
  assert.match(actual, /^<details class="collapse-block collapse-success">/);
  assert.match(actual, /<summary>タイトル<\/summary>/);
  assert.match(actual, /<div class="collapse-content">/);
  assert.match(actual, /中身/);
  assert.match(actual, /<\/details>$/);
});

test('preprocessShokaMarkdown: 同一 id の ;;; ブロックを 1 つのタブグループに結合', () => {
  const actual = p(';;;one A\nAAA\n;;;\n;;;one B\nBBB\n;;;\n\n次の段落').trim();
  assert.match(actual, /^<div class="tab-group" data-tab-group="one">/);
  assert.match(actual, /<button class="tab-header active"[^>]*>A<\/button>/);
  assert.match(actual, /<button class="tab-header"[^>]*>B<\/button>/);
  assert.match(actual, /<div class="tab-panel active"[^>]*>\s*AAA\s*<\/div>/);
  assert.match(actual, /<div class="tab-panel"[^>]*>\s*BBB\s*<\/div>/);
  assert.match(actual, /<\/div>\s*\n\s*\n次の段落$/);
});

test('preprocessShokaMarkdown: {% links %} の YAML をカード一覧に変換', () => {
  const actual = p(
    '{% links %}\n- site: example\n  url: https://example.com\n{% endlinks %}',
  ).trim();
  assert.match(actual, /^<div class="friend-links-grid">/);
  assert.match(actual, /href="https:\/\/example.com"/);
  assert.match(actual, /<div class="name">example<\/div>/);
});

test('preprocessShokaMarkdown: links の YAML が壊れていてもビルドを止めない', () => {
  const actual = p('{% links %}\n  :\n  :\n{% endlinks %}');
  assert.match(actual, /<!-- links YAML の解析に失敗しました -->/);
});

test('preprocessShokaMarkdown: コードフェンス内は変換しない', () => {
  const source = '```\n:::note\nコード内\n:::\n```';
  assert.equal(p(source), source);
});

test('preprocessShokaMarkdown: エスケープした ++ はリテラルとして残す', () => {
  assert.equal(p('\\++強調\\++'), '+<!-- -->+強調+<!-- -->+');
  assert.equal(p('++強調++'), '++強調++');
});

test('preprocessShokaMarkdown: ~sub~ ^sup^ を HTML 化しインラインコード内は触らない', () => {
  assert.equal(p('H~2~O と x^2^'), 'H<sub>2</sub>O と x<sup>2</sup>');
  assert.equal(p('`code~x~`'), '`code~x~`');
});

test('preprocessShokaMarkdown: 変換不要な入力はそのまま返す', () => {
  const source = 'ただの段落';
  assert.equal(p(source), source);
});

test('preprocessShokaMarkdown: containers 無効時は ::: を変換しない', () => {
  const source = ':::note\n本文\n:::';
  assert.equal(p(source, { containers: false, hexoTags: false }), source);
});

test('preprocessShokaMarkdown: superSub 無効時は ~sub~ を変換しない', () => {
  assert.equal(p('H~2~O', { superSub: false }), 'H~2~O');
});
