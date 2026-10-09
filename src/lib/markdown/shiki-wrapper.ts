/**
 * Shiki transformer: コードブロックのラッパーとツールバー生成
 *
 * <pre> を div.code-block-wrapper で包み、ビルド時にツールバー HTML を組み立てる。
 * 8 行を超えるブロックは code-collapsible + code-collapsed (初期折りたたみ)。
 * 折りたたみ/コピー/全画面の挙動はクライアント側スクリプトが担当。
 */
import type { Element, ElementContent } from 'hast';
import type { ShikiTransformer } from 'shiki';

/** これ以上の行数は初期折りたたみ対象 (koharu 互換) */
const COLLAPSE_LINE_THRESHOLD = 8;

interface WrapperOptions {
  /** コピー button を出すか (enableCodeCopy) */
  copy?: boolean;
  /** 全画面 button を出すか (enableCodeFullscreen) */
  fullscreen?: boolean;
}

function textElement(value: string): ElementContent {
  return { type: 'text', value };
}

function button(
  className: string,
  label: string,
  extraProps: Record<string, string> = {},
): Element {
  return {
    type: 'element',
    tagName: 'button',
    properties: {
      type: 'button',
      class: `code-btn ${className}`,
      'aria-label': label,
      title: label,
      ...extraProps,
    },
    children: [
      { type: 'element', tagName: 'span', properties: {}, children: [textElement(label)] },
    ],
  };
}

export function codeBlockWrapperTransformer(options?: WrapperOptions): ShikiTransformer {
  return {
    name: 'code-block-wrapper',
    root(root) {
      if (this.pre.tagName !== 'pre') return;
      const preIndex = root.children.indexOf(this.pre);
      if (preIndex === -1) return;

      const lineCount = this.source.replace(/\n$/, '').split('\n').length;
      const collapsible = lineCount > COLLAPSE_LINE_THRESHOLD;

      const properties: Record<string, string> = { class: 'code-block-wrapper' };
      if (collapsible) properties.class += ' code-collapsible code-collapsed';

      // --- ツールバー (ビルド時生成 — JS 無しでも表示される) ---
      const language = String(this.options.lang ?? '');

      const title = this.pre.properties['data-title'];
      const url = this.pre.properties['data-url'];
      const linkText = this.pre.properties['data-link-text'];

      const toolbarChildren: ElementContent[] = [
        {
          type: 'element',
          tagName: 'span',
          properties: { class: 'traffic-lights', 'aria-hidden': 'true' },
          children: [
            { type: 'element', tagName: 'i', properties: {}, children: [] },
            { type: 'element', tagName: 'i', properties: {}, children: [] },
            { type: 'element', tagName: 'i', properties: {}, children: [] },
          ],
        },
        {
          type: 'element',
          tagName: 'span',
          properties: { class: 'code-toolbar-lang' },
          children: [textElement(language)],
        },
      ];
      if (title) {
        toolbarChildren.push({
          type: 'element',
          tagName: 'span',
          properties: { class: 'code-toolbar-title' },
          children: [textElement(String(title))],
        });
      }
      if (url && /^https?:\/\//.test(String(url))) {
        toolbarChildren.push({
          type: 'element',
          tagName: 'a',
          properties: {
            class: 'code-toolbar-link',
            href: String(url),
            rel: ['noopener', 'noreferrer'],
          },
          children: [textElement(String(linkText || url))],
        });
      }
      toolbarChildren.push({
        type: 'element',
        tagName: 'span',
        properties: { class: 'code-toolbar-spacer' },
        children: [],
      });
      if (collapsible) {
        toolbarChildren.push(button('code-btn-collapse', '展開', { 'aria-expanded': 'false' }));
      }
      if (options?.fullscreen) {
        toolbarChildren.push(button('code-btn-fullscreen', '全画面'));
      }
      if (options?.copy) {
        toolbarChildren.push(button('code-btn-copy', 'コピー'));
      }

      const toolbar: Element = {
        type: 'element',
        tagName: 'div',
        properties: { class: 'code-block-toolbar' },
        children: toolbarChildren,
      };

      const wrapperChildren: ElementContent[] = [toolbar, this.pre];

      if (collapsible) {
        wrapperChildren.push({
          type: 'element',
          tagName: 'button',
          properties: {
            type: 'button',
            class: 'code-block-expand-overlay',
            'aria-label': '展開',
            title: '展開',
          },
          children: [
            {
              type: 'element',
              tagName: 'span',
              properties: { class: 'code-block-expand-overlay-icon' },
              children: [textElement('展開 ▾')],
            },
          ],
        });
      }

      root.children[preIndex] = {
        type: 'element',
        tagName: 'div',
        properties,
        children: wrapperChildren,
      };
    },
  };
}
