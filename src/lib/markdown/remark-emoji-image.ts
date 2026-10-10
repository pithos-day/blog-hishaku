/**
 * remark プラグイン: インライン絵文字
 *
 * `:emoji[url]` を <img class="emoji-image"> に変換する。
 * `:emoji[url alt="説明"]` / `:emoji[url render=pixelated]` にも対応。
 * remark-directive の textDirective ノードを走査する。
 */
import type { Html, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { escapeHtml } from './escape';

interface EmojiDirectiveNode {
  type: string;
  name: string;
  attributes?: Record<string, string | null | undefined>;
  children?: Array<{ type: string; value?: string }>;
}

export function remarkEmojiImage() {
  return (tree: Root) => {
    visit(tree, 'textDirective', (node, index, parent) => {
      if (index === undefined || !parent) return;
      const directive = node as unknown as EmojiDirectiveNode;
      if (directive.name !== 'emoji') return;

      const src =
        directive.children
          ?.filter((child) => child.type === 'text' && typeof child.value === 'string')
          .map((child) => child.value)
          .join('') ?? '';
      if (!src) return;

      const alt = directive.attributes?.alt;
      const render = directive.attributes?.render;

      let content = `<img class="emoji-image" src="${escapeHtml(src)}" `;
      if (alt) content += `alt="${escapeHtml(alt)}" `;
      if (render) content += `style="image-rendering: ${escapeHtml(render)}" `;
      content += '>';

      parent.children[index] = { type: 'html', value: content } as Html;
    });
  };
}
