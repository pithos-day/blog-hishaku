/**
 * remark プラグイン: Shoka ルビ構文
 *
 * {漢字^かんじ}  → <ruby>漢字<rp>(</rp><rt>かんじ</rt><rp>)</rp></ruby>
 * {漢字^=かんじ} → 読みの先頭 `=` を除去して全体に付与
 * {漢字^*}       → 着重点 (text-emphasis: filled circle)
 */
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { escapeHtml } from './escape';
import { SHOKA_RUBY_PATTERN } from './ruby-pattern';
import { replaceTextParts } from './text-rewrite';

const RUBY_REGEX = new RegExp(SHOKA_RUBY_PATTERN.source, 'g');

/** ルビ (または着重点) の HTML を組み立てる */
function renderRuby(baseText: string, annotation: string): string {
  if (annotation === '*') {
    return `<span class="emphasis-dots">${escapeHtml(baseText)}</span>`;
  }
  const rubyText = annotation.startsWith('=') ? annotation.slice(1) : annotation;
  return `<ruby>${escapeHtml(baseText)}<rp>(</rp><rt>${escapeHtml(rubyText)}</rt><rp>)</rp></ruby>`;
}

export function remarkShokaRuby() {
  return (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (!('children' in parent)) return;

      const parts = replaceTextParts(node.value, RUBY_REGEX, (match) => ({
        html: renderRuby(match[1], match[2]),
      }));
      if (!parts) return;
      parent.children.splice(index, 1, ...parts);
    });
  };
}
