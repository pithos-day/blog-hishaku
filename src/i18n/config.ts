/**
 * i18n Configuration
 *
 * ロケール設定の単一ソース。`config/site.yaml` の `i18n:` はこの既定値を
 * 基準に補完・検証され (src/lib/config/schema.ts)、辞書は
 * `src/i18n/translations/` に置かれる。
 *
 * site.yaml の値は設定読み込み時に `configureDefaultLocale()` で反映される
 * (src/lib/config/index.ts と astro.config.mjs の 2 箇所)。
 * そのため、このモジュールは site.yaml を直接読まない。
 *
 * このモジュールは astro.config (Node) とブラウザの両方から読まれるため、
 * yaml の `?raw` インポートなど Vite 固有の機能に依存しない。
 */

/**
 * サイトは単一言語で出力する (読者が言語を切り替える仕組みは持たない)。
 * 記事は翻訳されないため、UI の文言だけ切り替えても読者の得にならないという判断。
 */
export interface I18nConfig {
  /** UI の文言・日付や数値の書式・<html lang> に使う言語 (BCP 47) */
  defaultLocale: string;
}

/** 既定のロケール設定 — site.yaml の i18n の既定値 */
export const defaultI18n: I18nConfig = {
  defaultLocale: 'ja',
};

/** サイトの言語 (BCP 47) — site.yaml 読み込み時に上書きされる。辞書のフォールバック先は常に ja */
let defaultLocaleCode: string = defaultI18n.defaultLocale;

/** site.yaml の `i18n.defaultLocale` を既定ロケールへ反映する (設定読み込み時に 1 回呼ぶ) */
export function configureDefaultLocale(code: string): void {
  defaultLocaleCode = code;
}

/** 現在のサイトの言語 (BCP 47) */
export function getDefaultLocale(): string {
  return defaultLocaleCode;
}
