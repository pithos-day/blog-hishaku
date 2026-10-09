/**
 * rehype プラグイン: 記事冒頭への目次 (TOC) 挿入
 *
 * h2/h3 見出し (rehype-slug が id を付けた後) を収集し、階層ツリーに編んで
 * <nav class="post-toc"> を本文先頭に挿入する。見出し数が minHeadings 未満の
 * 場合は何もしない。rehype-autolink-headings より前に走らせたいので、
 * アンカー追加前に対象見出しを拾う。
 */
import type { Element, ElementContent, Root, RootContent } from 'hast';
import { t } from '../../i18n';

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

interface TocNode extends HeadingItem {
  children: TocNode[];
}

interface TocOptions {
  /** 目次を出す最低見出し数 (既定: 2) */
  minHeadings?: number;
}

/** 要素内のテキストを連結して取り出す */
function toPlainText(node: ElementContent): string {
  if (node.type === 'text') return node.value;
  if (node.type === 'element') return node.children.map(toPlainText).join('');
  return '';
}

/** ツリー全体を走査して h2/h3 (id 付き) を平坦に収集する */
function collectHeadings(node: RootContent, out: HeadingItem[]): void {
  if (node.type !== 'element') return;
  if ((node.tagName === 'h2' || node.tagName === 'h3') && typeof node.properties.id === 'string') {
    const text = toPlainText(node).trim();
    if (text !== '') {
      out.push({ id: node.properties.id, text, level: node.tagName === 'h2' ? 2 : 3 });
    }
  }
  for (const child of node.children) collectHeadings(child, out);
}

/** 平坦な見出し列を h2 > h3 の入れ子ツリーに編む */
function buildTree(headings: HeadingItem[]): TocNode[] {
  const roots: TocNode[] = [];
  let currentH2: TocNode | null = null;

  for (const heading of headings) {
    const node: TocNode = { ...heading, children: [] };
    if (heading.level === 2) {
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

/** 再帰的に <ul> ツリーを生成する */
function renderList(nodes: TocNode[]): Element {
  return {
    type: 'element',
    tagName: 'ul',
    properties: { class: 'post-toc-list' },
    children: nodes.map(
      (node): Element => ({
        type: 'element',
        tagName: 'li',
        properties: { class: 'post-toc-item' },
        children: [
          {
            type: 'element',
            tagName: 'a',
            properties: { href: `#${node.id}` },
            children: [{ type: 'text', value: node.text }],
          },
          ...(node.children.length > 0 ? [renderList(node.children)] : []),
        ],
      }),
    ),
  };
}

export function rehypeToc(options?: TocOptions) {
  const minHeadings = options?.minHeadings ?? 2;

  return (tree: Root) => {
    const headings: HeadingItem[] = [];
    for (const child of tree.children) collectHeadings(child, headings);
    if (headings.length < minHeadings) return;

    const title = t('toc.title');
    const toc: Element = {
      type: 'element',
      tagName: 'nav',
      properties: {
        class: 'post-toc',
        'aria-label': title,
        'data-pagefind-ignore': 'all',
      },
      children: [
        {
          type: 'element',
          tagName: 'p',
          properties: { class: 'post-toc-title' },
          children: [{ type: 'text', value: title }],
        },
        renderList(buildTree(headings)),
      ],
    };
    tree.children.unshift(toc);
  };
}
