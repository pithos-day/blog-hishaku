/**
 * 生成スクリプト用: Markdown ファイルのパスから、記事 URL のスラッグを求める。
 *
 * サイト側のスラッグ (src/lib/posts.ts の getPostSlug) は Astro の glob ローダーが
 * 作る id を元にするため、その id の作り方 (astro/dist/content/utils.js の
 * getContentEntryIdAndSlug) をここで再現する。
 * - frontmatter の `slug` があればそれを id にする
 * - なければパスの各階層を github-slugger で変換し、末尾の `/index` を落とす
 * そのうえで getPostSlug と同じく `link` を優先し、小文字にする。
 */
import path from 'node:path';
import { slug as githubSlug } from 'github-slugger';

/** src/content.config.ts の BLOG_CONTENT_GLOB_PATTERN と同じ対象 */
export const BLOG_CONTENT_DIR = 'src/content/blog';
export const BLOG_CONTENT_GLOB = `${BLOG_CONTENT_DIR}/**/*.{md,mdx}`;
export const BLOG_CONTENT_GLOB_IGNORE = [
  `${BLOG_CONTENT_DIR}/**/_*/**`,
  `${BLOG_CONTENT_DIR}/**/_*.{md,mdx}`,
];

interface SlugFrontmatter {
  link?: unknown;
  slug?: unknown;
}

/** Astro の glob ローダーと同じ規則で、コンテンツディレクトリからの相対パスを id にする */
export function entryIdFromPath(relativePath: string, frontmatterSlug?: unknown): string {
  if (frontmatterSlug) return String(frontmatterSlug);
  const withoutExt = relativePath.replace(/\\/g, '/').replace(/\.[^./]+$/, '');
  return withoutExt
    .split('/')
    .map((segment) => githubSlug(segment))
    .join('/')
    .replace(/\/index$/, '');
}

/** 記事 URL のスラッグ (getPostSlug と同じ値) */
export function postSlugFromFile(filePath: string, frontmatter: SlugFrontmatter): string {
  if (typeof frontmatter.link === 'string' && frontmatter.link) {
    return frontmatter.link.toLowerCase();
  }
  const relativePath = path.relative(BLOG_CONTENT_DIR, filePath);
  return entryIdFromPath(relativePath, frontmatter.slug).toLowerCase();
}
