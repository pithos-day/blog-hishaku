import { z } from 'astro/zod';
import type { I18nConfig } from '../../i18n/config';

/** umami の公開エンドポイント (自己ホスト時は endpoint で上書き) */
export const UMAMI_CLOUD_ORIGIN = 'https://cloud.umami.is';

// ロケール設定の型と既定値は i18n モジュールが所有する
// (site.yaml の i18n はこの既定値を基準に補完される)
export { defaultI18n, type I18nConfig } from '../../i18n/config';

export interface SiteConfig {
  site: {
    title: string;
    alternate?: string;
    subtitle?: string;
    name?: string;
    author?: string;
    description?: string;
    avatar?: string;
    url: string;
    defaultOgImage?: string;
    startYear?: number;
    timezone: string;
    keywords: string[];
  };
  i18n: I18nConfig;
  categoryMap: Record<string, string>;
  social: Record<string, { url: string; icon?: string; color?: string }>;
  seo: {
    robots?: {
      policy?: Array<{
        userAgent: string;
        allow?: string | string[];
        disallow?: string | string[];
        crawlDelay?: number;
      }>;
      host?: string | boolean;
      sitemap?: string | string[] | boolean;
    };
  };
  content: ContentOptions;
  analytics: { umami?: UmamiConfig };
}

export interface UmamiConfig {
  enabled: boolean;
  id: string;
  endpoint: string;
}

const localeSchema = z.object({
  code: z.string().min(1),
  label: z.string().min(1),
  enabled: z.boolean().default(true),
});

const socialLinkSchema = z.object({
  url: z.string().min(1),
  icon: z.string().optional(),
  color: z.string().optional(),
});

const contentSchema = z.object({
  addBlankTarget: z.boolean().optional(),
  smoothScroll: z.boolean().optional(),
  addHeadingLevel: z.boolean().optional(),
  enableToc: z.boolean().optional(),
  enhanceCodeBlock: z.boolean().optional(),
  enableCodeCopy: z.boolean().optional(),
  enableCodeFullscreen: z.boolean().optional(),
  enableShokaContainers: z.boolean().optional(),
  enableShokaAttrs: z.boolean().optional(),
  enableShokaEffects: z.boolean().optional(),
  enableShokaSpoiler: z.boolean().optional(),
  enableShokaRuby: z.boolean().optional(),
  enableShokaHexoTags: z.boolean().optional(),
  enableMath: z.boolean().optional(),
  enableCodeMeta: z.boolean().optional(),
  /** 独行リンクを埋め込みカードに変換する (総スイッチ) */
  enableLinkEmbed: z.boolean().optional(),
  /** 独行の Twitter/X リンクをツイート埋め込みにする */
  enableTweetEmbed: z.boolean().optional(),
  /** 独行の一般リンクに OG プレビューカードを表示 (ビルド時にメタデータ取得) */
  enableOGPreview: z.boolean().optional(),
  /** OG プレビューデータのキャッシュ日数 */
  previewCacheTime: z.number().min(0).optional(),
});

/** contentSchema が受け付けるキーの形 (全フィールドが optional) */
type ContentSchemaOutput = z.infer<typeof contentSchema>;

/**
 * コンテンツ関連の設定 (`site.yaml` の `content`)。
 * 主体は真偽値のスイッチだが、日数指定の `previewCacheTime` も同じグループに置く。
 *
 * 形状は `contentSchema` から導出するので、フィールド追加は contentSchema と
 * contentDefaults の 2 箇所を直せばよく、型の追従はコンパイラが担保する。
 *
 * `addBlankTarget` / `smoothScroll` / `addHeadingLevel` / `enhanceCodeBlock` は
 * `enable*` 以前から存在するキーで、site.yaml の公開キーを変えると利用者の設定が
 * 破れるため命名体系は揃えていない。
 */
export type ContentOptions = { [K in keyof ContentSchemaOutput]-?: ContentSchemaOutput[K] };

export const contentDefaults: ContentOptions = {
  addBlankTarget: true,
  smoothScroll: true,
  addHeadingLevel: true,
  enableToc: true,
  enhanceCodeBlock: true,
  enableCodeCopy: true,
  enableCodeFullscreen: false,
  enableShokaContainers: true,
  enableShokaAttrs: true,
  enableShokaEffects: true,
  enableShokaSpoiler: true,
  enableShokaRuby: true,
  enableShokaHexoTags: true,
  enableMath: true,
  enableCodeMeta: true,
  enableLinkEmbed: true,
  enableTweetEmbed: true,
  enableOGPreview: true,
  previewCacheTime: 30,
};

/**
 * `config/site.yaml` のスキーマ。
 * 未知のキーは Zod の既定挙動で strip されるため、対応外のキーが含まれていても
 * エラーにはなりません(対応するキーだけが反映されます)。
 * グループ欠損時の既定値は normalize(`site.ts`)で一括補完します。
 */
/** umami 設定。空値 (null) は未設定とみなして既定値で補完する */
const umamiSchema = z.object({
  enabled: z
    .boolean()
    .nullish()
    .transform((v) => v ?? false),
  id: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  endpoint: z
    .string()
    .nullish()
    .transform((v) => v ?? UMAMI_CLOUD_ORIGIN),
});

/** 解析設定 (現状 umami のみ) */
const analyticsSchema = z.object({
  umami: umamiSchema.optional(),
});

export const siteYamlSchema = z.object({
  site: z.object({
    title: z.string().min(1),
    alternate: z.string().optional(),
    subtitle: z.string().optional(),
    name: z.string().optional(),
    author: z.string().optional(),
    description: z.string().optional(),
    avatar: z.string().optional(),
    url: z.url(),
    defaultOgImage: z.string().optional(),
    startYear: z.number().int().optional(),
    timezone: z.string().default('Asia/Tokyo'),
    keywords: z.array(z.string()).default([]),
  }),
  i18n: z
    .object({
      defaultLocale: z.string().optional(),
      locales: z.array(localeSchema).optional(),
    })
    .optional(),
  categoryMap: z.record(z.string(), z.string()).default({}),
  social: z.record(z.string(), socialLinkSchema).default({}),
  seo: z
    .object({
      /** astro-robots-txt の設定 (policy / host / sitemap)。未設定なら全許可 */
      robots: z
        .object({
          policy: z
            .array(
              z.object({
                userAgent: z.string(),
                allow: z.union([z.string(), z.array(z.string())]).optional(),
                disallow: z.union([z.string(), z.array(z.string())]).optional(),
                crawlDelay: z.number().optional(),
              }),
            )
            .optional(),
          host: z.union([z.string(), z.boolean()]).optional(),
          sitemap: z.union([z.string(), z.array(z.string()), z.boolean()]).optional(),
        })
        .nullish(),
    })
    .optional(),
  content: contentSchema.optional(),
  analytics: analyticsSchema.optional(),
});

/** `site.yaml` が持っていてもよいトップレベルキー(未対応のものは警告対象) */
export const KNOWN_TOP_LEVEL_KEYS = [
  'site',
  'i18n',
  'categoryMap',
  'social',
  'seo',
  'content',
  'analytics',
] as const;
