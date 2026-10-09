/**
 * 記事の文字数・読了時間。
 * astro-koharu が reading-time パッケージで行う集計に相当する最小実装 (依存なし)。
 * 日本語主体のため 1 分あたり 400 字で概算する (CJK 記事の一般的な目安)。
 */
import { type PostEntry, toPlainText } from './posts';

export interface TextStats {
  /** 空白を除いた本文の文字数 */
  characters: number;
  /** 読了時間 (分・端数切り上げ・最低 1 分) */
  minutes: number;
}

const CJK_CHARS_PER_MINUTE = 400;

export function getTextStats(post: PostEntry): TextStats {
  const plain = toPlainText(post.body ?? '');
  const characters = plain.replace(/\s/g, '').length;
  const minutes = Math.max(1, Math.ceil(characters / CJK_CHARS_PER_MINUTE));
  return { characters, minutes };
}

export function formatCharacterCount(characters: number): string {
  return `${characters.toLocaleString('ja-JP')} 文字`;
}

export function formatReadingTime(minutes: number): string {
  return `約 ${minutes} 分`;
}
