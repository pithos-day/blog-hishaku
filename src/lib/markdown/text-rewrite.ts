/**
 * テキストノードの置換共通処理。
 *
 * 「一致部分の前後をテキストノードへ分割 → 置換 HTML を差し込む → 末尾を残す」
 * という並びは ruby / spoiler / インライン効果プラグインで同一なので、
 * ここに集約して各プラグインは構文解釈だけに集中する。
 */
import type { PhrasingContent } from 'mdast';

export interface TextReplacement {
  /** 置換後の HTML (呼び出し側でエスケープ済みであること) */
  html: string;
  /** マッチの直後から追加で消費する文字数 (続く `{attrs}` の分) */
  skip?: number;
}

/**
 * `text` を `pattern` (global) で走査し、置換結果のノード列を返す。
 * 1 つもマッチしない場合は null (呼び出し側はノードを触らない)。
 */
export function replaceTextParts(
  text: string,
  pattern: RegExp,
  render: (match: RegExpExecArray) => TextReplacement,
): PhrasingContent[] | null {
  const parts: PhrasingContent[] = [];
  pattern.lastIndex = 0;
  let lastIndex = 0;

  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const { html, skip = 0 } = render(match);
    parts.push({ type: 'html', value: html });
    lastIndex = match.index + match[0].length + skip;
    // 追加分 (skip) まで含めて走査位置を進める
    pattern.lastIndex = lastIndex;
  }

  if (parts.length === 0) return null;
  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return parts;
}
