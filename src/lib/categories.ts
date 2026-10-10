import { siteConfig } from './config';
import { getPublishedPosts, type PostEntry, sortByDateDesc } from './posts';

export type CategoryChain = string[];

export interface CategoryNode {
  /** 表示名 (階層末尾) */
  name: string;
  /** ルートからの表示名の並び */
  names: string[];
  /** URL スラッグパス (例: "note/front-end") */
  slugPath: string;
  /** 自分自身と子孫を含む記事 (catalog: true のみ・日付降順) */
  posts: PostEntry[];
  children: CategoryNode[];
}

/**
 * frontmatter の categories を正規化する。
 * - `['a', 'b']`       → 1 本の階層チェーン [a > b] (Hexo 互換)
 * - `[['a'], ['b']]`   → 複数のチェーン
 */
export function normalizeCategories(
  categories: string[] | string[][] | undefined,
): CategoryChain[] {
  if (!categories || categories.length === 0) return [];
  if (Array.isArray(categories[0])) return categories as CategoryChain[];
  return [categories as string[]];
}

/** カテゴリ名 → URL スラッグセグメント (categoryMap 適用・未登録は名前のまま) */
function resolveSegment(name: string): string {
  return siteConfig.categoryMap[name] ?? name;
}

/** 表示名の並び → URL スラッグパス ("note/front-end") */
export function buildCategorySlugPath(names: string[]): string {
  return names.map(resolveSegment).join('/');
}

/** 表示名の並び → リンク先 ("/categories/note/front-end") */
export function buildCategoryHref(names: string[]): string {
  const encoded = buildCategorySlugPath(names).split('/').map(encodeURIComponent).join('/');
  return `/categories/${encoded}`;
}

/**
 * 記事一覧からカテゴリツリーを組み立てる。
 * - `catalog: false` の記事はツリー・件数・カテゴリページの双方から除外
 * - 親ノードの posts は子孫カテゴリの記事を含む (祖先プレフィックス一致)
 */
export async function getCategoryTree(): Promise<{
  roots: CategoryNode[];
  byPath: Map<string, CategoryNode>;
}> {
  const posts = await getPublishedPosts();
  const roots = new Map<string, CategoryNode>();
  const byPath = new Map<string, CategoryNode>(); // キー: names.join('\n')

  for (const post of posts) {
    if (post.data.catalog === false) continue;
    const visited = new Set<string>();
    for (const chain of normalizeCategories(post.data.categories)) {
      let names: string[] = [];
      for (const name of chain) {
        if (!name) continue;
        names = [...names, name];
        const key = names.join('\n');
        if (visited.has(key)) continue;
        visited.add(key);

        let node = byPath.get(key);
        if (!node) {
          node = {
            name,
            names: [...names],
            slugPath: buildCategorySlugPath(names),
            posts: [],
            children: [],
          };
          byPath.set(key, node);
          if (names.length === 1) {
            roots.set(key, node);
          } else {
            byPath.get(names.slice(0, -1).join('\n'))?.children.push(node);
          }
        }
        node.posts.push(post);
      }
    }
  }

  const sortRecursively = (nodes: CategoryNode[]): CategoryNode[] => {
    for (const node of nodes) {
      node.posts = sortByDateDesc(node.posts);
      node.children = sortRecursively(node.children);
    }
    return nodes.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  };

  return { roots: sortRecursively([...roots.values()]), byPath };
}
