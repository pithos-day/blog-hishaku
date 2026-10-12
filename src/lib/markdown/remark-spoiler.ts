/**
 * remark プラグイン: Shoka スポイザー構文
 *
 * !!secret!!       → <span class="spoiler">secret</span> (クリックで表示)
 * !!secret!!{.blur} → class に .blur を追加 (ブラーオフのまま表示)
 */
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { parseAttrTokens, TRAILING_ATTR_PATTERN } from './attr-tokens';
import { escapeHtml } from './escape';
import { replaceTextParts } from './text-rewrite';

const SPOILER_REGEX = /!!([^!\s](?:[^!]*[^!\s])?)!!/g;

export function remarkShokaSpoiler() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (!('children' in parent)) return;

      const text = node.value;
      const parts = replaceTextParts(text, SPOILER_REGEX, (match) => {
        // 直後の `{.class ...}` をクラスとして消費
        const attrMatch = TRAILING_ATTR_PATTERN.exec(text.slice(match.index + match[0].length));
        const extraClasses = attrMatch ? parseAttrTokens(attrMatch[1]).classes : [];
        const classes = ['spoiler', ...extraClasses].join(' ');
        return {
          html: `<span class="${classes}">${escapeHtml(match[1])}</span>`,
          skip: attrMatch?.[0].length,
        };
      });
      if (!parts) return;
      parent.children.splice(index, 1, ...parts);
    });
  };
}
