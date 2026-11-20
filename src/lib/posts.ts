import { type CollectionEntry, getCollection } from 'astro:content';
import { toPlainText } from './text';

export type PostEntry = CollectionEntry<'blog'>;

/**
 * 記事の URL スラッグ。`link` があればそれを使い、なければファイル名 (id)。
 * 小文字化する。
 */
export function getPostSlug(post: PostEntry): string {
  return (post.data.link ?? post.id).toLowerCase();
}

/** 記事 URL (`/post/<slug>/`) — 末尾スラッシュは sitemap / canonical の表記に合わせる */
export function postPath(slug: string): string {
  return `/post/${slug}/`;
}

/** ビルド時に生成する OGP 画像のパス (src/pages/og/[...path].ts が出力する) */
export function generatedOgImagePath(slug: string): string {
  return `/og/${slug}.png`;
}

/** 記事の OGP 画像 (JSON-LD の image と共用)。cover が無ければ生成した画像を使う */
export function getPostOgImage(post: PostEntry): string {
  return post.data.cover ?? generatedOgImagePath(getPostSlug(post));
}

/** 本番ビルドでは下書きを除外し、開発時は含める */
function isPublished(post: PostEntry): boolean {
  return import.meta.env.DEV || !post.data.draft;
}

/** 下書きマーク・注意書きを出すか (本番ビルドでは下書きであることを隠す) */
export function shouldShowDraft(post: PostEntry): boolean {
  return !import.meta.env.PROD && Boolean(post.data.draft);
}

/** sticky → 日付降順 (同日は id 昇順で安定化) */
function comparePosts(a: PostEntry, b: PostEntry): number {
  const sticky = Number(b.data.sticky ?? false) - Number(a.data.sticky ?? false);
  if (sticky !== 0) return sticky;
  const dateDiff = b.data.date.getTime() - a.data.date.getTime();
  if (dateDiff !== 0) return dateDiff;
  return a.id.localeCompare(b.id);
}

export async function getPublishedPosts(): Promise<PostEntry[]> {
  const posts = await getCollection('blog', isPublished);
  return posts.sort(comparePosts);
}

/** 日付降順に並べ替える (sticky 順ではない。アーカイブ・カレンダー等で使う) */
export function sortByDateDesc(posts: Iterable<PostEntry>): PostEntry[] {
  return [...posts].sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/**
 * 記事の表示用説明。手書き description がなければ本文の冒頭 150 字を使う。
 * 文字数はコードポイントで数える (UTF-16 で切ると絵文字などのサロゲートペアが半分残る)。
 */
export function getPostDescription(post: PostEntry, maxLength = 150): string {
  if (post.data.description) return post.data.description;
  const plain = toPlainText(post.body ?? '');
  const chars = Array.from(plain);
  if (chars.length <= maxLength) return plain;
  return `${chars.slice(0, maxLength).join('')}…`;
}
