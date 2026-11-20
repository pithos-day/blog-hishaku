/**
 * i18n Utility Functions
 *
 * 翻訳とプレースホルダ補完のコアヘルパ。純関数なので
 * ビルド (Node)・SSR・ブラウザのどこからでも使える。
 *
 * サイトは単一ロケールで出力するため、ロケール引数は持たず
 * 既定ロケール (site.yaml の i18n.defaultLocale) を常に使う。
 */

import { getDefaultLocale } from './config';
import { translations } from './translations';
import { uiStrings as defaultStrings } from './translations/ja';
import type { Message, TranslationKey, TranslationParams } from './types';

/**
 * 数量で語形が変わる文言から、`count` に合う語形を選ぶ。
 * count が数値でなければ (整形済みの文字列など) 選べないので other を使う。
 */
function selectForm(message: Message, count: unknown, locale: string): string {
  if (typeof message === 'string') return message;
  if (typeof count !== 'number') return message.other;
  const category = new Intl.PluralRules(locale).select(count);
  return message[category] ?? message.other;
}

/**
 * 文字列中の {param} プレースホルダを値で置換する。
 * 数値の `count` はロケールの桁区切りで整形する (1200 → '1,200')。
 */
function interpolate(value: string, locale: string, params?: TranslationParams): string {
  if (!params) return value;
  let result = value;
  for (const [param, val] of Object.entries(params)) {
    const text =
      param === 'count' && typeof val === 'number'
        ? new Intl.NumberFormat(locale).format(val)
        : String(val);
    result = result.replaceAll(`{${param}}`, text);
  }
  return result;
}

/**
 * 翻訳キーを既定ロケールの文字列に変換する。
 *
 * 参照順:
 * 1. 既定ロケールの辞書 (translations[getDefaultLocale()]、例: en-US)
 * 2. その言語サブタグの辞書 (例: en)
 * 3. 既定辞書 (translations/ja)
 *
 * 数量で語形が変わる文言は、数値の `count` から語形を選ぶ (Intl.PluralRules)。
 *
 * @example
 * ```ts
 * t('post.charCount', { count: 1200 })  // => '1,200文字'
 * t('common.postCount', { count: 1 })   // => '1 件' (en なら '1 post')
 * t('common.search')                    // => '検索'
 * ```
 */
export function t(key: TranslationKey, params?: TranslationParams): string {
  const locale = getDefaultLocale();
  // 地域付きのタグ (en-US など) でも、言語の辞書 (en) を引けるようにする
  const language = locale.split('-')[0].toLowerCase();
  const message =
    translations[locale]?.[key] ?? translations[language]?.[key] ?? defaultStrings[key];

  if (!message) {
    // 開発時のみ警告 (キーは型で保証されるので通常は起きない)
    if (import.meta.env?.DEV) {
      console.warn(`[i18n] 翻訳キーが見つかりません: "${key}"`);
    }
    return key;
  }

  return interpolate(selectForm(message, params?.count, locale), locale, params);
}
