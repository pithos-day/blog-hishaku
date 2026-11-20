/**
 * 記事の文字数・読了時間。
 * 依存ライブラリなしの最小実装。
 *
 * 読了時間は本文を文字種で数え分け、それぞれの時間を足す。
 * - 漢字・かなを含む語と和文の約物 (、。「」など): 文字数 ÷ charsPerMinute
 * - それ以外の語 (英語・韓国語・タイ語など): 語数 ÷ wordsPerMinute
 * 約物を数えるのは、日本語の「1 分 400 字」が句読点込みの文字数で使われる目安だから
 *   (他サイトの読了時間と感覚を揃える)。英語の句読点は語数で数えるので含めない。
 * 語の切り出しは Intl.Segmenter に任せるため、空白で区切らない言語 (タイ語など) も数えられる。
 * 数え方は本文の中身で決まるので、サイト言語と違う言語の記事や日英混在の記事でも崩れない。
 * 速度は site.yaml の `reading` で変えられる (既定値は src/lib/config/schema.ts)。
 */
import { getDefaultLocale, t } from '../i18n';
import { siteConfig } from './config';
import type { ReadingOptions } from './config/schema';
import type { PostEntry } from './posts';
import { toPlainText } from './text';

export interface TextStats {
  /** 空白を除いた本文の文字数 */
  characters: number;
  /** 本文の語数 (Intl.Segmenter で切り出した語の数) */
  words: number;
  /** 読了時間 (分・端数切り上げ・最低 1 分) */
  minutes: number;
}

/** 1 文字ずつ数える文字 (漢字・かな と、それらと併用される長音記号など) */
const CJK_CHAR =
  /[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}]/gu;

/** 和文の約物 (語ではない部分のうち文字数に含めるもの): CJK の記号・全角形・… — ― */
const CJK_PUNCTUATION =
  /[\p{Script_Extensions=Han}\p{Script_Extensions=Hiragana}\p{Script_Extensions=Katakana}\u3001-\u303F\uFF01-\uFFEF\u2014\u2015\u2026]/gu;

/** 本文を語に分け、漢字・かな・和文の約物の文字数とそれ以外の語数を数える */
export function countReadingUnits(plain: string, locale: string): { chars: number; words: number } {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  let chars = 0;
  let words = 0;
  for (const { segment, isWordLike } of segmenter.segment(plain)) {
    if (!isWordLike) {
      chars += segment.match(CJK_PUNCTUATION)?.length ?? 0;
      continue;
    }
    const cjk = segment.match(CJK_CHAR)?.length ?? 0;
    if (cjk > 0) chars += cjk;
    else words += 1;
  }
  return { chars, words };
}

/** 本文の語数。記号や空白は数えない */
export function countWords(plain: string, locale: string): number {
  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
  let words = 0;
  for (const { isWordLike } of segmenter.segment(plain)) {
    if (isWordLike) words += 1;
  }
  return words;
}

/** プレーンテキストの読了時間 (分・端数切り上げ・最低 1 分) */
export function estimateReadingMinutes(
  plain: string,
  speed: ReadingOptions,
  locale = getDefaultLocale(),
): number {
  const { chars, words } = countReadingUnits(plain, locale);
  const minutes = chars / speed.charsPerMinute + words / speed.wordsPerMinute;
  return Math.max(1, Math.ceil(minutes));
}

export function getTextStats(post: PostEntry): TextStats {
  const plain = toPlainText(post.body ?? '');
  const characters = plain.replace(/\s/g, '').length;
  const words = countWords(plain, getDefaultLocale());
  return { characters, words, minutes: estimateReadingMinutes(plain, siteConfig.reading) };
}

/**
 * 本文の量を語数で表示する言語 (BCP 47 の言語サブタグ)。
 * 空白で語を区切る言語は語数 (word count) で示すのが一般的で、
 * それ以外 (日本語など) は文字数で示す。
 */
const WORD_COUNT_LANGUAGES = new Set(['en']);

/** 本文の量を、サイト言語に合わせて文字数か語数で表示する */
export function formatTextLength(stats: TextStats): string {
  const language = new Intl.Locale(getDefaultLocale()).language;
  return WORD_COUNT_LANGUAGES.has(language)
    ? t('post.wordCount', { count: stats.words })
    : t('post.charCount', { count: stats.characters });
}

export function formatReadingTime(minutes: number): string {
  return t('post.readingTime', { minutes });
}
