/**
 * remark プラグイン: Shoka テキスト効果
 *
 * - ++text++ → <ins>text</ins>
 * - ==text== → <mark>text</mark>
 *
 * テキストノードを走査して置換し、直後に続く `{.class #id key=value}` を
 * 要素属性として取り込む。~sub~ / ^sup^ は GFM と衝突するため
 * preprocessor (生テキスト段階) で処理する。
 */
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { parseAttrTokens, TRAILING_ATTR_PATTERN } from './attr-tokens';
import { escapeHtml } from './escape';
import { replaceTextParts } from './text-rewrite';

/** 属性トークンを HTML 属性文字列に変換する */
function buildAttrString(raw: string): string {
  const { classes, id, attrs } = parseAttrTokens(raw);

  const parts: string[] = [];
  if (id) parts.push(`id="${id}"`);
  if (classes.length > 0) parts.push(`class="${classes.join(' ')}"`);
  parts.push(...attrs.map(({ key, value }) => `${key}="${escapeHtml(value)}"`));
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

/** インライン置換の共通実装 */
function createInlineEffect(pattern: RegExp, tagName: string) {
  return () => (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (!('children' in parent)) return;

      const text = node.value;
      const parts = replaceTextParts(text, pattern, (match) => {
        // 続く `{attrs}` を属性として消費
        const attrMatch = TRAILING_ATTR_PATTERN.exec(text.slice(match.index + match[0].length));
        return {
          html: `<${tagName}${attrMatch ? buildAttrString(attrMatch[1]) : ''}>${escapeHtml(
            match[1],
          )}</${tagName}>`,
          skip: attrMatch?.[0].length,
        };
      });
      if (!parts) return;
      parent.children.splice(index, 1, ...parts);
    });
  };
}

/** ++text++ → <ins>text</ins> */
export const remarkIns = createInlineEffect(/\+\+([^\s+](?:[^+]*[^\s+])?)\+\+/g, 'ins');

/** ==text== → <mark>text</mark> */
export const remarkMark = createInlineEffect(/==([^\s=](?:[^=]*[^\s=])?)(?<!=)==/g, 'mark');
