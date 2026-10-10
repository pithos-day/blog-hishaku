import { type CollectionEntry, getCollection } from 'astro:content';

export type PostEntry = CollectionEntry<'blog'>;

/**
 * 記事の URL スラッグ。`link` があればそれを使い、なければファイル名 (id)。
 * 小文字化する。
 */
export function getPostSlug(post: PostEntry): string {
  return (post.data.link ?? post.id).toLowerCase();
}

/** 本番ビルドでは下書きを除外し、開発時は含める */
function isPublished(post: PostEntry): boolean {
  return import.meta.env.DEV || !post.data.draft;
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

/** Markdown 本文から表示用のプレーンテキストを取り出す */
export function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}[#>*+-]+\s?/gm, '')
    .replace(/[*_~^|=]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 記事の表示用説明。手書き description がなければ本文の冒頭 150 字を使う。
 */
export function getPostDescription(post: PostEntry, maxLength = 150): string {
  if (post.data.description) return post.data.description;
  const plain = toPlainText(post.body ?? '');
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength)}…`;
}
