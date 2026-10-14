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

/**
 * 表示名の並び → URL スラッグパス ("note/front-end")
 * categoryMap は既定で siteConfig を使う。テストは site.yaml の内容に
 * 依存しないよう自前のマップを渡せる。
 */
export function buildCategorySlugPath(
  names: string[],
  categoryMap: Record<string, string> = siteConfig.categoryMap,
): string {
  // カテゴリ名 → URL スラッグセグメント (categoryMap 適用・未登録は名前のまま)
  return names.map((name) => categoryMap[name] ?? name).join('/');
}

/** 表示名の並び → リンク先 ("/categories/note/front-end/") */
export function buildCategoryHref(
  names: string[],
  categoryMap: Record<string, string> = siteConfig.categoryMap,
): string {
  const encoded = buildCategorySlugPath(names, categoryMap)
    .split('/')
    .map(encodeURIComponent)
    .join('/');
  return `/categories/${encoded}/`;
}

/**
 * Map のキー: names を 1 つの文字列へ畳む (カテゴリ名に改行はあり得ないので区切りに使える)。
 * キーの作り方はここだけに置き、byPath / visited は同じ形式を使う。
 */
const CATEGORY_KEY_SEPARATOR = '\n';

function categoryKey(names: string[]): string {
  return names.join(CATEGORY_KEY_SEPARATOR);
}

/** 記事をツリーへ積む。visited で同一記事の同一カテゴリへの二重計上を防ぐ */
function addPostToTree(
  post: PostEntry,
  roots: Map<string, CategoryNode>,
  byPath: Map<string, CategoryNode>,
): void {
  const visited = new Set<string>();
  for (const chain of normalizeCategories(post.data.categories)) {
    const names: string[] = [];
    for (const name of chain) {
      if (!name) continue;
      names.push(name);
      const key = categoryKey(names);
      if (visited.has(key)) continue;
      visited.add(key);
      getOrCreateNode(name, names, key, roots, byPath).posts.push(post);
    }
  }
}

/** ノードが無ければ作成して親へ接続し、有ればそのまま返す */
function getOrCreateNode(
  name: string,
  names: string[],
  key: string,
  roots: Map<string, CategoryNode>,
  byPath: Map<string, CategoryNode>,
): CategoryNode {
  const existing = byPath.get(key);
  if (existing) return existing;

  const node: CategoryNode = {
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
    // 親は必ず先に作られている (祖先から順に積み上げるため)
    byPath.get(categoryKey(names.slice(0, -1)))?.children.push(node);
  }
  return node;
}

/** 子孫まで記事を日付降順にし、各階層の子を名前順に整列する */
function sortTreeRecursively(nodes: CategoryNode[]): CategoryNode[] {
  for (const node of nodes) {
    node.posts = sortByDateDesc(node.posts);
    node.children = sortTreeRecursively(node.children);
  }
  return nodes.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
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
  const byPath = new Map<string, CategoryNode>(); // キー: categoryKey(names)

  for (const post of posts) {
    if (post.data.catalog === false) continue;
    addPostToTree(post, roots, byPath);
  }

  return { roots: sortTreeRecursively([...roots.values()]), byPath };
}
