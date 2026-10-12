/**
 * i18n Utility Functions
 *
 * 翻訳とプレースホルダ補完のコアヘルパ。純関数なので
 * ビルド (Node)・SSR・ブラウザのどこからでも使える。
 *
 * このテンプレートは日本語のみのため、ロケール引数は持たず
 * 既定ロケール (site.yaml の i18n.defaultLocale) を常に使う。
 */

import { getDefaultLocale } from './config';
import { translations } from './translations';
import { uiStrings as defaultStrings } from './translations/ja';
import type { TranslationKey, TranslationParams } from './types';

/** 文字列中の {param} プレースホルダを値で置換する */
function interpolate(value: string, params?: TranslationParams): string {
  if (!params) return value;
  let result = value;
  for (const [param, val] of Object.entries(params)) {
    result = result.replaceAll(`{${param}}`, String(val));
  }
  return result;
}

/**
 * 翻訳キーを既定ロケールの文字列に変換する。
 *
 * 参照順:
 * 1. 既定ロケールの辞書 (translations[getDefaultLocale()])
 * 2. 既定辞書 (translations/ja)
 *
 * @example
 * ```ts
 * t('post.charCount', { count: '1,200' })  // => '1,200文字'
 * t('common.search')                        // => '検索'
 * ```
 */
export function t(key: TranslationKey, params?: TranslationParams): string {
  const dict = translations[getDefaultLocale()];
  const value = dict?.[key] ?? defaultStrings[key];

  if (!value) {
    // 開発時のみ警告 (キーは型で保証されるので通常は起きない)
    if (import.meta.env?.DEV) {
      console.warn(`[i18n] 翻訳キーが見つかりません: "${key}"`);
    }
    return key;
  }

  return interpolate(value, params);
}
