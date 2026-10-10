/**
 * SEO JSON-LD ビルダーの単体テスト。
 *
 * 記事ページの script タグにそのまま埋め込まれるため、
 * 1) `<` のエスケープ 2) タイムゾーン変換 3) パンくず項目の構造 を固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildArticleJsonLd, buildBreadcrumbJsonLd, toJsonLdHtml } from '../src/lib/seo.ts';

const site = {
  url: 'https://example.com/',
  timezone: 'Asia/Tokyo',
  keywords: ['ブログ', 'Astro'],
  authorName: 'Your Name',
};

const article = {
  headline: 'テスト記事',
  description: '説明文',
  keywords: ['Astro', 'Markdown'],
  date: new Date('2026-01-01T15:00:00Z'),
  mainEntityOfPage: 'https://example.com/post/test/',
};

test('toJsonLdHtml: `<` をエスケープしてJSONとして復元できる', () => {
  const html = toJsonLdHtml({ note: '<script>alert(1)</script>' });
  assert.equal(html.includes('<'), false);
  assert.deepEqual(JSON.parse(html), { note: '<script>alert(1)</script>' });
});

test('buildArticleJsonLd: BlogPosting の基本フィールドを組み立てる', () => {
  const ld = buildArticleJsonLd(article, site);
  assert.equal(ld['@context'], 'https://schema.org');
  assert.equal(ld['@type'], 'BlogPosting');
  assert.equal(ld.headline, 'テスト記事');
  assert.equal(ld.description, '説明文');
  assert.equal(ld.mainEntityOfPage, 'https://example.com/post/test/');
  assert.deepEqual(ld.author, {
    '@type': 'Person',
    name: 'Your Name',
    url: 'https://example.com/',
  });
});

test('buildArticleJsonLd: キーワードはサイト分と合成し重複を除去する', () => {
  const ld = buildArticleJsonLd(article, site);
  assert.deepEqual(ld.keywords, ['Astro', 'Markdown', 'ブログ']);
});

test('buildArticleJsonLd: 日付はサイトタイムゾーン基準のyyyy-MM-dd', () => {
  const ld = buildArticleJsonLd(article, site);
  assert.equal(ld.datePublished, '2026-01-02');
  assert.equal(ld.dateModified, undefined);

  const withUpdated = buildArticleJsonLd(
    { ...article, updated: new Date('2026-01-01T15:00:00Z') },
    { ...site, timezone: 'UTC' },
  );
  assert.equal(withUpdated.datePublished, '2026-01-01');
  assert.equal(withUpdated.dateModified, '2026-01-01');
});

test('buildArticleJsonLd: image なしでは image キー自体を出力しない', () => {
  assert.equal('image' in buildArticleJsonLd(article, site), false);
  const withImage = buildArticleJsonLd({ ...article, image: 'https://example.com/og.png' }, site);
  assert.equal(withImage.image, 'https://example.com/og.png');
});

test('buildBreadcrumbJsonLd: カテゴリなし記事は undefined', () => {
  assert.equal(
    buildBreadcrumbJsonLd({
      categoryChain: [],
      title: '記事',
      homeLabel: 'ホーム',
      siteUrl: 'https://example.com/',
      categoryHref: () => '/',
    }),
    undefined,
  );
});

test('buildBreadcrumbJsonLd: ホーム → カテゴリ → 記事 の順で item を組み立てる', () => {
  const ld = buildBreadcrumbJsonLd({
    categoryChain: ['フロントエンド', 'Astro'],
    title: 'テスト記事',
    homeLabel: 'ホーム',
    siteUrl: 'https://example.com/',
    categoryHref: (chain) => `/categories/${chain.join('/')}/`,
  });
  assert.equal(ld['@type'], 'BreadcrumbList');
  assert.deepEqual(ld.itemListElement, [
    { '@type': 'ListItem', position: 1, name: 'ホーム', item: 'https://example.com/' },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'フロントエンド',
      item: new URL('/categories/フロントエンド/', 'https://example.com/').href,
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Astro',
      item: new URL('/categories/フロントエンド/Astro/', 'https://example.com/').href,
    },
    { '@type': 'ListItem', position: 4, name: 'テスト記事' },
  ]);
});
