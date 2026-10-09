/**
 * Shiki transformer: コードブロックの枠と操作ボタン生成
 *
 * <pre> を div.code-frame で包み、右上に操作ボタン (Lucide アイコン) を並べる。
 * 8 行を超えるブロックは code-frame--foldable + code-frame--folded (初期折りたたみ)。
 * 折りたたみ・コピー・全画面の挙動はクライアント側スクリプトが担当。
 */
import type { Element, ElementContent, Properties } from 'hast';
import { Check, ChevronsDownUp, ChevronsUpDown, Copy, type IconNode, Maximize } from 'lucide';
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

/** Lucide の IconNode から静的 SVG 要素を組み立てる */
function iconSvg(icon: IconNode, className?: string): Element {
  const properties: Properties = {
    xmlns: 'http://www.w3.org/2000/svg',
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': 2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  };
  if (className) properties.class = className;

  return {
    type: 'element',
    tagName: 'svg',
    properties,
    children: icon.map(([tag, attrs]) => ({
      type: 'element',
      tagName: tag,
      properties: { ...attrs },
      children: [],
    })),
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
            [iconSvg(ChevronsDownUp, 'icon-fold'), iconSvg(ChevronsUpDown, 'icon-unfold')],
            { 'aria-expanded': 'false' },
          ),
        );
      }
      if (options?.fullscreen) {
        controls.push(iconButton('full', t('code.fullscreen'), [iconSvg(Maximize)]));
      }
      if (options?.copy) {
        controls.push(
          iconButton('copy', t('code.copy'), [
            iconSvg(Copy, 'icon-copy'),
            iconSvg(Check, 'icon-copied'),
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
          children: [iconSvg(ChevronsUpDown)],
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
