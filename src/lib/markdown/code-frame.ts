/**
 * Shiki transformer: コードブロックの枠とツールバー生成
 *
 * <pre> を div.code-frame で包み、ビルド時にツールバー HTML を組み立てる。
 * 8 行を超えるブロックは code-frame--foldable + code-frame--folded (初期折りたたみ)。
 * 折りたたみ・コピー・全画面の挙動はクライアント側スクリプトが担当。
 */
import type { Element, ElementContent } from 'hast';
import type { ShikiTransformer } from 'shiki';

/** これ以上の行数は初期折りたたみ対象 */
const FOLD_LINE_THRESHOLD = 8;

interface FrameOptions {
  /** コピー button を出すか (enableCodeCopy) */
  copy?: boolean;
  /** 全画面 button を出すか (enableCodeFullscreen) */
  fullscreen?: boolean;
}

function textNode(value: string): ElementContent {
  return { type: 'text', value };
}

function makeButton(
  modifier: string,
  label: string,
  extraProps: Record<string, string> = {},
): Element {
  return {
    type: 'element',
    tagName: 'button',
    properties: {
      type: 'button',
      class: `frame-btn frame-btn-${modifier}`,
      'aria-label': label,
      title: label,
      ...extraProps,
    },
    children: [{ type: 'element', tagName: 'span', properties: {}, children: [textNode(label)] }],
  };
}

export function codeFrameTransformer(options?: FrameOptions): ShikiTransformer {
  return {
    name: 'code-frame',
    root(root) {
      if (this.pre.tagName !== 'pre') return;
      const preIndex = root.children.indexOf(this.pre);
      if (preIndex === -1) return;

      const lineCount = this.source.replace(/\n$/, '').split('\n').length;
      const foldable = lineCount > FOLD_LINE_THRESHOLD;

      const wrapperProperties: Record<string, string> = { class: 'code-frame' };
      if (foldable) wrapperProperties.class += ' code-frame--foldable code-frame--folded';

      const language = String(this.options.lang ?? '');
      const title = this.pre.properties['data-code-title'];
      const url = this.pre.properties['data-code-url'];
      const linkText = this.pre.properties['data-code-link'];

      const barChildren: ElementContent[] = [
        {
          type: 'element',
          tagName: 'span',
          properties: { class: 'frame-dots', 'aria-hidden': 'true' },
          children: [
            { type: 'element', tagName: 'i', properties: {}, children: [] },
            { type: 'element', tagName: 'i', properties: {}, children: [] },
            { type: 'element', tagName: 'i', properties: {}, children: [] },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: { class: 'frame-lang' },
          children: [textNode(language)],
        },
      ];
      if (title) {
        barChildren.push({
          type: 'element',
          tagName: 'span',
          properties: { class: 'frame-title' },
          children: [textNode(String(title))],
        });
      }
      if (url && /^https?:\/\//.test(String(url))) {
        barChildren.push({
          type: 'element',
          tagName: 'a',
          properties: {
            class: 'frame-link',
            href: String(url),
            rel: ['noopener', 'noreferrer'],
          },
          children: [textNode(String(linkText || url))],
        });
      }
      barChildren.push({
        type: 'element',
        tagName: 'span',
        properties: { class: 'frame-spacer' },
        children: [],
      });
      if (foldable) {
        barChildren.push(makeButton('fold', '展開', { 'aria-expanded': 'false' }));
      }
      if (options?.fullscreen) {
        barChildren.push(makeButton('full', '全画面'));
      }
      if (options?.copy) {
        barChildren.push(makeButton('copy', 'コピー'));
      }

      const bar: Element = {
        type: 'element',
        tagName: 'div',
        properties: { class: 'code-frame-bar' },
        children: barChildren,
      };

      const wrapperChildren: ElementContent[] = [bar, this.pre];

      if (foldable) {
        wrapperChildren.push({
          type: 'element',
          tagName: 'button',
          properties: {
            type: 'button',
            class: 'fold-overlay',
            'aria-label': '展開',
            title: '展開',
          },
          children: [
            {
              type: 'element',
              tagName: 'span',
              properties: { class: 'fold-overlay-chip' },
              children: [textNode('展開 ▾')],
            },
          ],
        });
      }

      root.children[preIndex] = {
        type: 'element',
        tagName: 'div',
        properties: wrapperProperties,
        children: wrapperChildren,
      };
    },
  };
}
