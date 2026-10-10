/**
 * Rehype プラグイン: 本文画像を figure でラップし、alt をキャプション表示する。
 * - `loading="lazy"` / `decoding="async"` を付与
 * - alt がある場合は figcaption を生成 (JS 無効でも CSS 表示のみなので常に有効)
 * - <a> 内の画像はリンクを壊さないよう figure ラップせず属性のみ付与
 * - figure のみで構成された <p> を unwrap (不正な <p><figure> 入れ子を解消)
 * - .cache/lqips.json があれば背景グラデーション (LQIP) を付与
 */
import type { Element, Root, Text } from 'hast';
import { SKIP, visit } from 'unist-util-visit';
import { getLqipGradient } from '../lqip';

export function rehypeImagePlaceholder() {
  return (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'img') return;
      if (index === undefined || !parent) return;

      // 既に figure 内 (カスタムコンポーネント等) ならスキップ
      if (parent.type === 'element' && parent.tagName === 'figure') return;

      const existingClass = Array.isArray(node.properties.class)
        ? node.properties.class.join(' ')
        : String(node.properties.class ?? '') || '';

      if (parent.type === 'element' && parent.tagName === 'a') {
        node.properties = {
          ...node.properties,
          loading: 'lazy',
          decoding: 'async',
        };
        const href = typeof parent.properties?.href === 'string' ? parent.properties.href : '';
        const linkedGradient = getLqipGradient(href);
        if (linkedGradient) {
          node.properties.style = `background-image:${linkedGradient}`;
        }
        return;
      }

      const src = typeof node.properties.src === 'string' ? node.properties.src : '';
      const gradient = getLqipGradient(src);

      node.properties = {
        ...node.properties,
        loading: 'lazy',
        decoding: 'async',
        class: `${existingClass} markdown-image`.trim(),
      };
      if (gradient) {
        node.properties.style = `background-image:${gradient}`;
      }

      const alt = typeof node.properties.alt === 'string' ? node.properties.alt.trim() : '';
      const caption: Element | null = alt
        ? {
            type: 'element',
            tagName: 'figcaption',
            properties: { class: 'markdown-image-caption' },
            children: [{ type: 'text', value: alt }],
          }
        : null;

      const wrapper: Element = {
        type: 'element',
        tagName: 'figure',
        properties: { class: 'markdown-image-wrapper' },
        children: caption ? [node, caption] : [node],
      };

      parent.children[index] = wrapper;
    });

    // figure のみを含む <p> を unwrap し、<p><figure> の不正入れ子を解消する
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p' || index === undefined || !parent) return;

      const meaningful = node.children.filter(
        (child) => !(child.type === 'text' && (child as Text).value.trim() === ''),
      );
      if (
        meaningful.length > 0 &&
        meaningful.every(
          (child) => child.type === 'element' && (child as Element).tagName === 'figure',
        )
      ) {
        parent.children.splice(index, 1, ...node.children);
        return [SKIP, index] as const;
      }
    });
  };
}
