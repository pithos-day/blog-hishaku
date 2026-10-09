/**
 * remark プラグイン: Shoka ルビ構文
 *
 * {漢字^かんじ}  → <ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>
 * {漢字^=かんじ} → 読みの先頭 `=` を除去して全体に付与
 * {漢字^*}       → 着重点 (text-emphasis: filled circle)
 */
import type { PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { escapeHtml } from './escape';
import { SHOKA_RUBY_PATTERN } from './ruby-pattern';

const RUBY_REGEX = new RegExp(SHOKA_RUBY_PATTERN.source, 'g');

export function remarkShokaRuby() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (!('children' in parent)) return;

      const text = node.value;
      RUBY_REGEX.lastIndex = 0;
      const parts: PhrasingContent[] = [];
      let lastIndex = 0;

      for (let match = RUBY_REGEX.exec(text); match !== null; match = RUBY_REGEX.exec(text)) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        const baseText = match[1];
        const annotation = match[2];

        if (annotation === '*') {
          parts.push({
            type: 'html',
            value: `<span class="emphasis-dots">${escapeHtml(baseText)}</span>`,
          });
        } else {
          const rubyText = annotation.startsWith('=') ? annotation.slice(1) : annotation;
          parts.push({
            type: 'html',
            value: `<ruby>${escapeHtml(baseText)}<rp>(</rp><rt>${escapeHtml(rubyText)}</rt><rp>)</rp></ruby>`,
          });
        }
        lastIndex = match.index + match[0].length;
      }

      if (parts.length === 0) return;
      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }
      parent.children.splice(index, 1, ...parts);
    });
  };
}
