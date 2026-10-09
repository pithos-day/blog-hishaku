/**
 * remark プラグイン: Shoka スポイザー構文
 *
 * !!secret!!       → <span class="spoiler">secret</span> (クリックで表示)
 * !!secret!!{.blur} → class に .blur を追加 (ブラーオフのまま表示)
 */
import type { PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { escapeHtml } from './escape';

const SPOILER_REGEX = /!!([^!\s](?:[^!]*[^!\s])?)!!/g;

/** 直後の `{.class ...}` からクラスだけ取り出す */
const TRAILING_ATTRS = /^\{([^}]+)\}/;
const CSS_IDENT = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;

function extractClasses(raw: string): string[] {
  return raw
    .split(/\s+/)
    .filter((token) => token.startsWith('.'))
    .map((token) => token.slice(1))
    .filter((cls) => CSS_IDENT.test(cls));
}

export function remarkShokaSpoiler() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (!('children' in parent)) return;

      const text = node.value;
      SPOILER_REGEX.lastIndex = 0;
      const parts: PhrasingContent[] = [];
      let lastIndex = 0;

      for (let match = SPOILER_REGEX.exec(text); match !== null; match = SPOILER_REGEX.exec(text)) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        let extraClasses: string[] = [];
        const after = text.slice(match.index + match[0].length);
        const attrMatch = TRAILING_ATTRS.exec(after);
        if (attrMatch) {
          extraClasses = extractClasses(attrMatch[1]);
          SPOILER_REGEX.lastIndex += attrMatch[0].length;
        }

        const classes = ['spoiler', ...extraClasses].join(' ');
        parts.push({
          type: 'html',
          value: `<span class="${classes}">${escapeHtml(match[1])}</span>`,
        });
        lastIndex = SPOILER_REGEX.lastIndex;
      }

      if (parts.length === 0) return;
      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }
      parent.children.splice(index, 1, ...parts);
    });
  };
}
