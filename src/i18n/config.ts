/**
 * i18n Configuration
 *
 * ロケール設定の単一ソース。`config/site.yaml` の `i18n:` はこの既定値を
 * 基準に補完・検証され (src/lib/config/schema.ts)、辞書は
 * `src/i18n/translations/` に置かれる。
 *
 * このモジュールは astro.config (Node) とブラウザの両方から読まれるため、
 * yaml の `?raw` インポートなど Vite 固有の機能に依存しない。
 */

export interface I18nConfig {
  defaultLocale: string;
  locales: { code: string; label: string; enabled: boolean }[];
}

/** 既定のロケール設定 — site.yaml の i18n の既定値 */
export const defaultI18n: I18nConfig = {
  defaultLocale: 'ja',
  locales: [{ code: 'ja', label: '日本語', enabled: true }],
};

/** 既定ロケールコード (辞書のフォールバック先) */
export const defaultLocale: string = defaultI18n.defaultLocale;

/** 有効なロケールコード一覧 */
export const localeList: string[] = defaultI18n.locales
  .filter((locale) => locale.enabled)
  .map((locale) => locale.code);

/** 複数ロケールが有効か */
export const isI18nEnabled = localeList.length > 1;

/**
 * ロケールコードが有効か
 */
export function isLocaleSupported(code: string): boolean {
  return localeList.includes(code);
}

/**
 * ロケールコードの表示名 (見つからなければコードそのもの)
 */
export function getLocaleLabel(code: string): string {
  return defaultI18n.locales.find((locale) => locale.code === code)?.label ?? code;
}
