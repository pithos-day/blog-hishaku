/**
 * schema.org JSON-LD ビルダー。
 *
 * 設定や Astro コンテキストに依存しない純粋関数として持ち、
 * 呼び出し側 (ページ) が siteConfig などの値を引数で渡す。
 */

/** schema.org 用: サイトタイムゾーン基準の yyyy-MM-dd */
function toSeoDate(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** `<script type="application/ld+json">` に埋め込む文字列 */
export function toJsonLdHtml(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export interface ArticleJsonLdInput {
  headline: string;
  description: string;
  /** 記事由来のキーワード (frontmatter keywords + タグ + カテゴリ)。サイト keywords と合成する */
  keywords: string[];
  date: Date;
  updated?: Date;
  /** OGP 画像と同一の完全 URL */
  image?: string;
  mainEntityOfPage: string;
}

export interface SeoSite {
  url: string;
  timezone: string;
  keywords: string[];
  authorName: string;
}

/** BlogPosting JSON-LD を組み立てる */
export function buildArticleJsonLd(
  post: ArticleJsonLdInput,
  site: SeoSite,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.headline,
    description: post.description,
    keywords: [...new Set([...post.keywords, ...site.keywords])],
    author: {
      '@type': 'Person',
      name: site.authorName,
      url: site.url,
    },
    datePublished: toSeoDate(post.date, site.timezone),
    ...(post.updated && { dateModified: toSeoDate(post.updated, site.timezone) }),
    ...(post.image && { image: post.image }),
    mainEntityOfPage: post.mainEntityOfPage,
  };
}

export interface BreadcrumbJsonLdInput {
  /** 先頭階層のカテゴリ名の並び。空配列なら undefined を返す (カテゴリなし記事) */
  categoryChain: string[];
  /** 最終項目の名前 (記事タイトル)。item は付けない */
  title: string;
  homeLabel: string;
  siteUrl: string;
  /** カテゴリ階層から URL パスを組み立てる (呼び出し側の buildCategoryHref) */
  categoryHref: (chain: string[]) => string;
}

/** カテゴリがある記事向けの BreadcrumbList JSON-LD (最後の項目は item なし) */
export function buildBreadcrumbJsonLd(
  input: BreadcrumbJsonLdInput,
): Record<string, unknown> | undefined {
  const { categoryChain } = input;
  if (categoryChain.length === 0) return undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: input.homeLabel,
        item: new URL('/', input.siteUrl).href,
      },
      ...categoryChain.map((name, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name,
        item: new URL(input.categoryHref(categoryChain.slice(0, index + 1)), input.siteUrl).href,
      })),
      { '@type': 'ListItem', position: categoryChain.length + 2, name: input.title },
    ],
  };
}
