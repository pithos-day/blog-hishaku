/**
 * 記事の見出しから目次ツリーを組み立てる
 *
 * Astro の render() が返す headings (depth / slug / text) を受け取り、
 * h2 > h3 の入れ子構造に編む。深度フィルタは collectTocHeadings が行う。
 * `content.enableToc` の判定は呼び出し側で行う (このモジュールは設定を知らない)。
 */

export interface TocHeading {
  depth: number;
  slug: string;
  text: string;
}

export interface TocNode {
  slug: string;
  text: string;
  children: TocNode[];
}

/** 目次に載せる深さ (h2 / h3) だけに絞る */
export function collectTocHeadings(headings: TocHeading[]): TocHeading[] {
  return headings.filter((heading) => heading.depth === 2 || heading.depth === 3);
}

/** 平坦な見出し列を h2 > h3 の入れ子ツリーに編む */
export function buildTocTree(headings: TocHeading[]): TocNode[] {
  const roots: TocNode[] = [];
  let currentH2: TocNode | null = null;

  for (const heading of headings) {
    const node: TocNode = { slug: heading.slug, text: heading.text, children: [] };
    if (heading.depth === 2) {
      roots.push(node);
      currentH2 = node;
    } else if (currentH2) {
      currentH2.children.push(node);
    } else {
      // 先頭が h3 の場合 (h2 の前) はルートに置く
      roots.push(node);
    }
  }
  return roots;
}
