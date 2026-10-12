import { parse as parseYaml } from 'yaml';
import {
  type ContentOptions,
  contentDefaults,
  defaultI18n,
  type I18nConfig,
  KNOWN_TOP_LEVEL_KEYS,
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

function normalizeI18n(
  raw: { defaultLocale?: string; locales?: I18nConfig['locales'] } | undefined,
): I18nConfig {
  const i18n: I18nConfig = {
    defaultLocale: raw?.defaultLocale ?? defaultI18n.defaultLocale,
    locales: raw?.locales
      ? raw.locales.map((l) => ({ ...l }))
      : defaultI18n.locales.map((l) => ({ ...l })),
  };
  // defaultLocale が有効なエントリとして locales に在るか (不在なら設定不備)
  const hasDefaultEntry = i18n.locales.some((l) => l.code === i18n.defaultLocale && l.enabled);
  if (!hasDefaultEntry) {
    throw new Error(
      `config/site.yaml: i18n.defaultLocale "${i18n.defaultLocale}" は i18n.locales に有効なエントリとして存在しません`,
    );
  }
  return i18n;
}

function normalizeContent(raw: Partial<ContentOptions> | undefined): ContentOptions {
  return { ...contentDefaults, ...raw };
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

  return {
    site: parsed.site,
    i18n: normalizeI18n(parsed.i18n),
    categoryMap: parsed.categoryMap,
    social: parsed.social,
    seo: { robots: parsed.seo?.robots ?? undefined },
    content: normalizeContent(parsed.content),
    analytics: parsed.analytics ?? {},
  };
}
