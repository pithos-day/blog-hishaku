/**
 * Shiki transformer: コードブロックの枠と操作ボタン生成
 *
 * <pre> を div.code-frame で包み、右上に操作ボタン (Remix Icon) を並べる。
 * 8 行を超えるブロックは code-frame--foldable + code-frame--folded (初期折りたたみ)。
 * 折りたたみ・コピー・全画面の挙動はクライアント側スクリプトが担当。
 */
import type { Element, ElementContent, Properties } from 'hast';
import type { ShikiTransformer } from 'shiki';
import { t } from '../../i18n';

/** これ以上の行数は初期折りたたみ対象 */
const FOLD_LINE_THRESHOLD = 8;

interface FrameOptions {
  /** コピー button を出すか (enableCodeCopy) */
  copy?: boolean;
  /** 全画面 button を出すか (enableCodeFullscreen) */
  fullscreen?: boolean;
}

/** Remix Icon (@iconify-json/ri) の SVG body — fill ベース */
const ICON_BODIES = {
  fold: '<path fill="currentColor" d="m12 4.836l-6.207 6.207l1.414 1.414L12 7.664l4.793 4.793l1.414-1.414zm0 5.65l-6.207 6.207l1.414 1.414L12 13.314l4.793 4.793l1.414-1.414z"/>',
  unfold:
    '<path fill="currentColor" d="m12 19.164l6.207-6.207l-1.414-1.414L12 16.336l-4.793-4.793l-1.414 1.414zm0-5.65l6.207-6.207l-1.414-1.414L12 10.686L7.207 5.893L5.793 7.307z"/>',
  fullscreen:
    '<path fill="currentColor" d="M8 3v2H4v4H2V3zM2 21v-6h2v4h4v2zm20 0h-6v-2h4v-4h2zm0-12h-2V5h-4V3h6z"/>',
  copy: '<path fill="currentColor" d="M7 6V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3v3c0 .552-.45 1-1.007 1H4.007A1 1 0 0 1 3 21l.003-14c0-.552.45-1 1.006-1zM5.002 8L5 20h10V8zM9 6h8v10h2V4H9z"/>',
  check:
    '<path fill="currentColor" d="m10 15.17l9.192-9.191l1.414 1.414L10 17.999l-6.364-6.364l1.414-1.414z"/>',
} as const;

/** SVG body 文字列を hast の子要素へパース (path / circle / rect / line / polyline / polygon に対応) */
function parseSvgBody(body: string): ElementContent[] {
  const children: ElementContent[] = [];
  const tagRe = /<(path|circle|rect|line|polyline|polygon)\s+([^>]*?)\/>/g;
  const attrRe = /(\w[\w-]*)="([^"]*)"/g;
  for (const match of body.matchAll(tagRe)) {
    const [, tag, attrStr] = match;
    const properties: Record<string, string | number | boolean> = {};
    for (const attr of attrStr.matchAll(attrRe)) {
      const [, key, value] = attr;
      properties[key] = value;
    }
    children.push({ type: 'element', tagName: tag, properties, children: [] });
  }
  return children;
}

/** Remix Icon の SVG 要素を組み立てる (fill ベース) */
function iconSvg(body: string, className?: string): Element {
  const properties: Properties = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    'aria-hidden': 'true',
  };
  if (className) properties.class = className;

  return {
    type: 'element',
    tagName: 'svg',
    properties,
    children: parseSvgBody(body),
  };
}

function iconButton(
  modifier: string,
  label: string,
  icons: Element[],
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
    children: icons,
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
      const multiline = lineCount > 1;

      const wrapperProperties: Record<string, string> = { class: 'code-frame' };
      if (multiline) wrapperProperties.class += ' code-frame--multiline';
      if (foldable) wrapperProperties.class += ' code-frame--foldable code-frame--folded';

      const controls: Element[] = [];
      if (foldable) {
        controls.push(
          iconButton(
            'fold',
            t('code.expand'),
            [iconSvg(ICON_BODIES.fold, 'icon-fold'), iconSvg(ICON_BODIES.unfold, 'icon-unfold')],
            { 'aria-expanded': 'false' },
          ),
        );
      }
      if (options?.fullscreen) {
        controls.push(iconButton('full', t('code.fullscreen'), [iconSvg(ICON_BODIES.fullscreen)]));
      }
      if (options?.copy) {
        controls.push(
          iconButton('copy', t('code.copy'), [
            iconSvg(ICON_BODIES.copy, 'icon-copy'),
            iconSvg(ICON_BODIES.check, 'icon-copied'),
          ]),
        );
      }

      const wrapperChildren: ElementContent[] = [];
      if (controls.length > 0) {
        wrapperChildren.push({
          type: 'element',
          tagName: 'div',
          properties: { class: 'frame-controls' },
          children: controls,
        });
      }
      wrapperChildren.push(this.pre);

      if (foldable) {
        wrapperChildren.push({
          type: 'element',
          tagName: 'button',
          properties: {
            type: 'button',
            class: 'fold-overlay',
            'aria-label': t('code.expand'),
            title: t('code.expand'),
          },
          children: [iconSvg(ICON_BODIES.unfold)],
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
