import { getPublishedPosts, type PostEntry } from './posts';

/** タグ名を小文字化して URL スラッグにする (日本語タグはそのまま通る) */
export function tagToSlug(tag: string): string {
  return tag.toLowerCase();
}

/** タグ名 → リンク先 ("/tags/astro/"・日本語タグはそのまま) */
export function buildTagHref(tag: string): string {
  return `/tags/${encodeURIComponent(tagToSlug(tag))}/`;
}

export interface TagInfo {
  /** 表示名 (最初に出現した表記) */
  name: string;
  /** 正規化済みスラッグ */
  slug: string;
  count: number;
}

/**
 * 記事一覧からタグと件数を集める (件数の降順・同数はスラッグ順)。
 * 件数は記事の数で数える。1 つの記事に `Astro` と `astro` のように同じスラッグの
 * タグがあっても 1 件とする (タグページに並ぶ記事の数と揃える)。
 */
export function collectTags(posts: readonly PostEntry[]): TagInfo[] {
  const bySlug = new Map<string, TagInfo>();
  for (const post of posts) {
    const slugsInPost = new Set<string>();
    for (const tag of post.data.tags ?? []) {
      const slug = tagToSlug(tag);
      if (slugsInPost.has(slug)) continue;
      slugsInPost.add(slug);
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

/** 全タグと件数 (日付降順記事ベース・下書きは開発時のみ) */
export async function getAllTags(): Promise<TagInfo[]> {
  return collectTags(await getPublishedPosts());
}

/** スラッグに一致する記事 (日付降順) */
export async function getPostsByTag(slug: string): Promise<PostEntry[]> {
  const posts = await getPublishedPosts();
  return posts.filter((post) => (post.data.tags ?? []).some((tag) => tagToSlug(tag) === slug));
}
