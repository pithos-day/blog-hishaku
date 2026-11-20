/**
 * 翻訳辞書のバーレル
 *
 * キーは ja が定義し、同梱のロケール (en) も全キーを持つ完全な辞書にする
 * (訳し漏れを型エラーで検出するため)。辞書が無い・キーが欠けたロケールは ja にフォールバックする。
 */

import type { UIStrings } from '../types';
import { uiStrings as en } from './en';
import { uiStrings as ja } from './ja';

/** ロケールコード → UI 文字列辞書 */
export const translations: Record<string, UIStrings> = {
  ja,
  en,
};
