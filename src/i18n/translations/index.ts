/**
 * 翻訳辞書のバーレル
 *
 * 既定ロケール (ja) が全キーの完全な辞書を提供し、他のロケールは
 * 部分的な上書きだけでよい (未定義キーは既定にフォールバック)。
 */

import type { DefaultUIStrings, UIStrings } from '../types';
import { uiStrings as ja } from './ja';

/** ロケールコード → UI 文字列辞書 */
export const translations: Record<string, DefaultUIStrings | UIStrings> = {
  ja,
};
