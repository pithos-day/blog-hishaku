import { parse as parseYaml } from 'yaml';
import {
  type ContentOptions,
  contentDefaults,
  defaultI18n,
  type I18nConfig,
  KNOWN_TOP_LEVEL_KEYS,
  type ReadingOptions,
  readingDefaults,
  readingDefaultsByLanguage,
  type SiteConfig,
  siteYamlSchema,
} from './schema';

function assertTimeZone(timezone: string): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    throw new Error(`config/site.yaml: site.timezone "${timezone}" は不正な IANA タイムゾーンです`);
  }
}

function normalizeI18n(raw: Partial<I18nConfig> | undefined): I18nConfig {
  return { defaultLocale: raw?.defaultLocale ?? defaultI18n.defaultLocale };
}

function normalizeContent(raw: Partial<ContentOptions> | undefined): ContentOptions {
  return { ...contentDefaults, ...raw };
}

/** 読了速度: 共通の既定値 → サイト言語ごとの既定値 → site.yaml の指定 の順に重ねる */
function normalizeReading(
  raw: Partial<ReadingOptions> | undefined,
  defaultLocale: string,
): ReadingOptions {
  return { ...readingDefaults, ...readingDefaultsByLanguage[defaultLocale], ...raw };
}

function warnIgnoredTopLevelKeys(doc: unknown): void {
  // astro.config (Node) では import.meta.env が無いため、警告は dev 起動時のみに限る
  if (typeof import.meta !== 'object' || import.meta.env?.DEV !== true) return;
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) return;
  const ignored = Object.keys(doc).filter(
    (key) => !(KNOWN_TOP_LEVEL_KEYS as readonly string[]).includes(key),
  );
  if (ignored.length > 0) {
    console.warn(`[site.yaml] このテンプレート未対応のキーを無視しました: ${ignored.join(', ')}`);
  }
}

/**
 * `config/site.yaml` の生文字列を検証・正規化して `SiteConfig` を返す純関数。
 * `astro.config.mjs` と `src/` の両方から使われる単一の入口。
 */
export function parseSiteYaml(raw: string): SiteConfig {
  let doc: unknown;
  try {
    doc = parseYaml(raw);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`config/site.yaml の YAML 解析に失敗しました: ${detail}`);
  }

  const result = siteYamlSchema.safeParse(doc ?? {});
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`config/site.yaml の形式が不正です:\n${details}`);
  }

  const parsed = result.data;
  assertTimeZone(parsed.site.timezone);

  warnIgnoredTopLevelKeys(doc);

  const i18n = normalizeI18n(parsed.i18n);
  return {
    site: parsed.site,
    i18n,
    categoryMap: parsed.categoryMap,
    social: parsed.social,
    seo: { robots: parsed.seo?.robots ?? undefined },
    content: normalizeContent(parsed.content),
    reading: normalizeReading(parsed.reading, i18n.defaultLocale),
    analytics: parsed.analytics ?? {},
  };
}
