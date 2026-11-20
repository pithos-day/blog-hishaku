/**
 * i18n Type Definitions
 *
 * 国際化システムのコア型。ロケールコードは BCP 47 短形式 (例: 'ja')。
 * 翻訳キーは既定ロケール (ja) の辞書から導出されるため、
 * `t()` に渡すキーの存在はコンパイル時保証される。
 */

import type { uiStrings as jaStrings } from './translations/ja';

/**
 * 翻訳キー — 既定 (ja) 辞書の全キー
 */
export type TranslationKey = keyof typeof jaStrings;

/**
 * 数量 (`count`) で語形が変わる文言。キーは Intl.PluralRules のカテゴリで、other は必須。
 * 英語なら `{ one: '{count} post', other: '{count} posts' }` のように書く。
 */
type PluralMessage = Partial<Record<Exclude<Intl.LDMLPluralRule, 'other'>, string>> & {
  other: string;
};

/** 辞書の値: 固定の文言か、数量で語形が変わる文言 */
export type Message = string | PluralMessage;

/**
 * UI 文字列辞書。キーが欠けていてもよく、欠けたキーは既定辞書 (ja) にフォールバックする
 */
export type UIStrings = Partial<Record<TranslationKey, Message>>;

/**
 * 既定ロケールの完全な辞書 (全キーを必須とする)
 */
export type DefaultUIStrings = Record<TranslationKey, Message>;

/**
 * 文字列中の {param} プレースホルダの置換値
 */
export type TranslationParams = Record<string, string | number>;
