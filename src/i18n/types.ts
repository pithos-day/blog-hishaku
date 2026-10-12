/**
 * i18n Type Definitions
 *
 * 国際化システムのコア型。ロケールコードは BCP 47 短形式 (例: 'ja')。
 * 翻訳キーは既定ロケール (ja) の辞書から導出されるため、
 * `t()` に渡すキーの存在はコンパイル時保証される。
 */

import type { uiStrings as jaStrings } from './translations/ja';

/**
 * サポートするロケールコード。
 * ロケールは site.yaml で動的に設定されるためリテラル連合は持たず、
 * `getDefaultLocale()` で現在の既定ロケールを読む。
 */
export type Locale = string;

/**
 * 翻訳キー — 既定 (ja) 辞書の全キー
 */
export type TranslationKey = keyof typeof jaStrings;

/**
 * UI 文字列辞書。他のロケールは既定キーの部分集合を提供すればよい
 */
export type UIStrings = Partial<Record<TranslationKey, string>>;

/**
 * 既定ロケールの完全な辞書 (全キーを必須とする)
 */
export type DefaultUIStrings = Record<TranslationKey, string>;

/**
 * 文字列中の {param} プレースホルダの置換値
 */
export type TranslationParams = Record<string, string | number>;
