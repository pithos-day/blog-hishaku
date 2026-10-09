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
import type { PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';
import { escapeHtml } from './escape';

/** 属性トークンに使える CSS 識別子 */
const CSS_IDENT = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;

/** 直後の `{.class #id key=value}` ブロック */
const TRAILING_ATTRS = /^\{([^}]+)\}/;

/** 属性トークンを HTML 属性文字列に変換する */
function buildAttrString(raw: string): string {
  const classes: string[] = [];
  let id = '';
  const attrs: string[] = [];

  for (const token of raw.split(/\s+/)) {
    if (token.startsWith('.')) {
      const cls = token.slice(1);
      if (CSS_IDENT.test(cls)) classes.push(cls);
    } else if (token.startsWith('#')) {
      const idValue = token.slice(1);
      if (CSS_IDENT.test(idValue)) id = idValue;
    } else if (token.includes('=')) {
      const [key, ...rest] = token.split('=');
      if (CSS_IDENT.test(key)) attrs.push(`${key}="${escapeHtml(rest.join('='))}"`);
    }
  }

  const parts: string[] = [];
  if (id) parts.push(`id="${id}"`);
  if (classes.length > 0) parts.push(`class="${classes.join(' ')}"`);
  parts.push(...attrs);
  return parts.length > 0 ? ` ${parts.join(' ')}` : '';
}

/** インライン置換の共通実装 */
function createInlineEffect(pattern: RegExp, tagName: string) {
  return () => (tree: Root) => {
    visit(tree, 'text', (node, index, parent) => {
      if (index === undefined || !parent) return;
      if (!('children' in parent)) return;

      const text = node.value;
      pattern.lastIndex = 0;
      const parts: PhrasingContent[] = [];
      let lastIndex = 0;

      for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }

        // 続く `{attrs}` を属性として消費
        let attrStr = '';
        const after = text.slice(match.index + match[0].length);
        const attrMatch = TRAILING_ATTRS.exec(after);
        if (attrMatch) {
          attrStr = buildAttrString(attrMatch[1]);
          pattern.lastIndex += attrMatch[0].length;
        }

        parts.push({
          type: 'html',
          value: `<${tagName}${attrStr}>${escapeHtml(match[1])}</${tagName}>`,
        });
        lastIndex = pattern.lastIndex;
      }

      if (parts.length === 0) return;
      if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
      }
      parent.children.splice(index, 1, ...parts);
    });
  };
}

/** ++text++ → <ins>text</ins> */
export const remarkIns = createInlineEffect(/\+\+([^\s+](?:[^+]*[^\s+])?)\+\+/g, 'ins');

/** ==text== → <mark>text</mark> */
export const remarkMark = createInlineEffect(/==([^\s=](?:[^=]*[^\s=])?)(?<!=)==/g, 'mark');
