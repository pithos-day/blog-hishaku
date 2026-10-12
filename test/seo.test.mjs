/**
 * SEO JSON-LD ビルダーの単体テスト。
 *
 * 記事ページの script タグにそのまま埋め込まれるため、
 * 1) `<` のエスケープ 2) タイムゾーン変換 3) パンくず項目の構造 を固定する。
 * アサーションには失敗時に意図が分かるメッセージを添える。
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
  assert.equal(html.includes('<'), false, 'エスケープ後は生の < を含まない');
  assert.deepEqual(
    JSON.parse(html),
    { note: '<script>alert(1)</script>' },
    'エスケープしてもJSONとしては元の文字列が復元できる',
  );
});

test('buildArticleJsonLd: BlogPosting の基本フィールドを組み立てる', () => {
  const ld = buildArticleJsonLd(article, site);
  assert.equal(ld['@context'], 'https://schema.org', 'schema.org コンテキストは必須');
  assert.equal(ld['@type'], 'BlogPosting', '記事の型は BlogPosting');
  assert.equal(ld.headline, 'テスト記事', '見出しは指定どおり');
  assert.equal(ld.description, '説明文', '説明文は指定どおり');
  assert.equal(ld.mainEntityOfPage, 'https://example.com/post/test/', '正規URLをそのまま載せる');
  assert.deepEqual(
    ld.author,
    {
      '@type': 'Person',
      name: 'Your Name',
      url: 'https://example.com/',
    },
    '著者はサイトURL付きの Person',
  );
});

test('buildArticleJsonLd: キーワードはサイト分と合成し重複を除去する', () => {
  const ld = buildArticleJsonLd(article, site);
  assert.deepEqual(
    ld.keywords,
    ['Astro', 'Markdown', 'ブログ'],
    '記事分を先に、サイト分のうち未出のものだけを追加する',
  );
});

test('buildArticleJsonLd: 日付はサイトタイムゾーン基準のyyyy-MM-dd', () => {
  const ld = buildArticleJsonLd(article, site);
  assert.equal(ld.datePublished, '2026-01-02', 'UTC 15:00 は Asia/Tokyo では翌日');
  assert.equal(ld.dateModified, undefined, 'updated 無しでは dateModified キー自体を出さない');

  const withUpdated = buildArticleJsonLd(
    { ...article, updated: new Date('2026-01-01T15:00:00Z') },
    { ...site, timezone: 'UTC' },
  );
  assert.equal(withUpdated.datePublished, '2026-01-01', 'UTC 基準なら 1/1 のまま');
  assert.equal(withUpdated.dateModified, '2026-01-01', 'updated 指定で dateModified が出る');
});

test('buildArticleJsonLd: image なしでは image キー自体を出力しない', () => {
  assert.equal(
    'image' in buildArticleJsonLd(article, site),
    false,
    'falsy な image はスプレッド結果が空でキーごと消える',
  );
  const withImage = buildArticleJsonLd({ ...article, image: 'https://example.com/og.png' }, site);
  assert.equal(withImage.image, 'https://example.com/og.png', '指定した image URL が出る');
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
    'カテゴリが無い記事はパンくずを出さない',
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
  assert.equal(ld['@type'], 'BreadcrumbList', '型は BreadcrumbList');
  assert.deepEqual(
    ld.itemListElement,
    [
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
    ],
    'ホームが 1 のためカテゴリは 2 から。最後の記事は item なし',
  );
});
