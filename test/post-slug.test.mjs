/**
 * scripts/post-slug.ts の単体テスト。
 *
 * 類似記事のキーとリンク先は、サイトの記事 URL (Astro の id 由来) と一致しなければならない。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { entryIdFromPath, postSlugFromFile } from '../scripts/post-slug.ts';

test('entryIdFromPath: 各階層を github-slugger で変換する (Astro の id と同じ)', () => {
  assert.equal(entryIdFromPath('front-end/Astro/Hello World.md'), 'front-end/astro/hello-world');
  assert.equal(entryIdFromPath('note/v1.2 notes.md'), 'note/v12-notes');
  assert.equal(entryIdFromPath('tools/C++ tips.mdx'), 'tools/c-tips');
  assert.equal(entryIdFromPath('life/日本語 メモ.md'), 'life/日本語-メモ');
});

test('entryIdFromPath: 末尾の index を落とし、Windows の区切りも扱う', () => {
  assert.equal(entryIdFromPath('note/series/index.md'), 'note/series');
  assert.equal(entryIdFromPath('note\\series\\part 1.md'), 'note/series/part-1');
});

test('entryIdFromPath: frontmatter の slug があればそれを使う', () => {
  assert.equal(entryIdFromPath('note/foo.md', 'Custom/Slug'), 'Custom/Slug');
});

test('postSlugFromFile: link を優先し、スラッグは小文字にする', () => {
  assert.equal(postSlugFromFile('src/content/blog/note/foo.md', { link: 'My-Post' }), 'my-post');
  assert.equal(postSlugFromFile('src/content/blog/note/Foo Bar.md', {}), 'note/foo-bar');
  assert.equal(postSlugFromFile('src/content/blog/note/foo.md', { slug: 'X/Y' }), 'x/y');
});
