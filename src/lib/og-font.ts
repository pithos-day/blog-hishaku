/**
 * OGP 画像用フォントの選択 (純粋関数)。
 *
 * 同梱の Gen Interface JP は unicode-range ごとに分割された woff2 のため、
 * @font-face の CSS を読み、描画する文字を含むサブセットだけを選ぶ。
 * ファイルの読み込みと woff2 の展開は src/lib/og-image.ts が担当する。
 */

export interface FontFaceSubset {
  weight: number;
  /** CSS からの相対パス (例: ./w/normal/400/000.woff2) */
  src: string;
  /** [開始, 終了] のコードポイント範囲 (単一の文字は開始 = 終了) */
  ranges: Array<[number, number]>;
}

/** `U+3000-303F,U+4E00` 形式の unicode-range を範囲の配列にする (U+4?? のワイルドカードにも対応) */
export function parseUnicodeRange(value: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  for (const part of value.split(',')) {
    const token = part.trim().replace(/^U\+/i, '');
    if (!token) continue;
    if (token.includes('?')) {
      ranges.push([
        Number.parseInt(token.replace(/\?/g, '0'), 16),
        Number.parseInt(token.replace(/\?/g, 'F'), 16),
      ]);
      continue;
    }
    const [start, end = start] = token.split('-');
    ranges.push([Number.parseInt(start, 16), Number.parseInt(end, 16)]);
  }
  return ranges;
}

/** @font-face の CSS から、ウェイト・ファイル・unicode-range を取り出す */
export function parseFontFaces(css: string): FontFaceSubset[] {
  const faces: FontFaceSubset[] = [];
  for (const [, body] of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const weight = body.match(/font-weight\s*:\s*(\d+)/)?.[1];
    const src = body.match(/src\s*:\s*url\(\s*["']?([^"')]+)["']?\s*\)/)?.[1];
    const range = body.match(/unicode-range\s*:\s*([^;]+)/)?.[1];
    if (!weight || !src || !range) continue;
    faces.push({ weight: Number(weight), src, ranges: parseUnicodeRange(range) });
  }
  return faces;
}

/** 指定ウェイトのサブセットのうち、text の文字を 1 つでも含むものを返す */
export function pickSubsetsForText(
  faces: readonly FontFaceSubset[],
  weight: number,
  text: string,
): FontFaceSubset[] {
  const codePoints = new Set<number>();
  for (const char of text) codePoints.add(char.codePointAt(0) as number);
  return faces.filter(
    (face) =>
      face.weight === weight &&
      face.ranges.some(([start, end]) => {
        for (const cp of codePoints) if (start <= cp && cp <= end) return true;
        return false;
      }),
  );
}

// 絵文字になり得る記号・肌色・国旗 (地域記号 / タグ文字)・結合用の文字 (ZWJ U+200D /
// VS16 U+FE0F / キーキャップ U+20E3)。satori は © ™ ♥ のような文字表示が既定の記号も
// 絵文字として扱い画像を取りに行くため、Extended_Pictographic はまとめて除く
const EMOJI_PATTERN =
  /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\p{Regional_Indicator}|[\u{E0020}-\u{E007F}]|\u{200D}|\u{FE0F}|\u{20E3}/gu;

/**
 * 絵文字を取り除く。@vercel/og は絵文字の画像をビルド中にネットワークから取りに行き、
 * 失敗するとビルドごと落ちるため、描画前に除いておく。
 */
export function stripEmoji(text: string): string {
  return text
    .replace(EMOJI_PATTERN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
