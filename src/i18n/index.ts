/**
 * i18n Module — Public API
 *
 * i18n システムの公開インターフェース。テンプレートからは
 * `import { t } from '@/i18n'` で使う (astro.config 等の Node コンテキスト
 * からは相対パスでインポートする)。
 *
 * 内部用シンボル (interpolate など) はここではエクスポートしない。
 */

export type { I18nConfig } from './config';
// Config — ロケール設定 (site.yaml の i18n 既定値の所有者)
export {
  configureDefaultLocale,
  defaultI18n,
  getDefaultLocale,
  getLocaleLabel,
  isI18nEnabled,
  isLocaleSupported,
  localeList,
} from './config';
// Types — 外部で消費される型のみ
export type { Locale, TranslationKey, TranslationParams, UIStrings } from './types';
// Utilities
export { t } from './utils';
