import { getPublishedPosts, type PostEntry } from './posts';

/** タグ名の正規化 (URL スラッグ用・koharu 互換で小文字化) */
export function normalizeTag(tag: string): string {
  return tag.toLowerCase();
}

/** タグ名 → URL スラッグ */
export function tagToSlug(tag: string): string {
  return normalizeTag(tag);
}

/** タグ名 → リンク先 ("/tags/astro"・日本語タグはそのまま) */
export function buildTagHref(tag: string): string {
  return `/tags/${encodeURIComponent(tagToSlug(tag))}`;
}

export interface TagInfo {
  /** 表示名 (最初に出現した表記) */
  name: string;
  /** 正規化済みスラッグ */
  slug: string;
  count: number;
}

/** 全タグと件数 (日付降順記事ベース・下書きは開発時のみ) */
export async function getAllTags(): Promise<TagInfo[]> {
  const posts = await getPublishedPosts();
  const bySlug = new Map<string, TagInfo>();
  for (const post of posts) {
    for (const tag of post.data.tags ?? []) {
      const slug = tagToSlug(tag);
      const existing = bySlug.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        bySlug.set(slug, { name: tag, slug, count: 1 });
      }
    }
  }
  return [...bySlug.values()].sort(
    (a, b) => b.count - a.count || a.slug.localeCompare(b.slug, 'ja'),
  );
}

/** スラッグに一致する記事 (日付降順) */
export async function getPostsByTag(slug: string): Promise<PostEntry[]> {
  const posts = await getPublishedPosts();
  return posts.filter((post) => (post.data.tags ?? []).some((tag) => tagToSlug(tag) === slug));
}
