import { z } from 'astro/zod';
import type { I18nConfig } from '../../i18n/config';

// ロケール設定の型と既定値は i18n モジュールが所有する
// (site.yaml の i18n はこの既定値を基準に補完される)
export { defaultI18n, type I18nConfig } from '../../i18n/config';

export interface NavItem {
  name: string;
  nameKey?: string;
  path?: string;
  icon?: string;
  feature?: string;
  localeIndependent?: boolean;
  children?: NavItem[];
}

export interface ContentFlags {
  addBlankTarget: boolean;
  smoothScroll: boolean;
  addHeadingLevel: boolean;
  enhanceCodeBlock: boolean;
  enableCodeCopy: boolean;
  enableCodeFullscreen: boolean;
  enableShokaContainers: boolean;
  enableShokaAttrs: boolean;
  enableShokaEffects: boolean;
  enableShokaSpoiler: boolean;
  enableShokaRuby: boolean;
  enableShokaHexoTags: boolean;
  enableMath: boolean;
  enableCodeMeta: boolean;
}

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
  navigation: NavItem[];
  seo: { robots?: string };
  content: ContentFlags;
}

const navItemSchema: z.ZodType<NavItem> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    nameKey: z.string().optional(),
    path: z.string().optional(),
    icon: z.string().optional(),
    feature: z.string().optional(),
    localeIndependent: z.boolean().optional(),
    children: z.array(navItemSchema).optional(),
  }),
);

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
});

export const contentDefaults: ContentFlags = {
  addBlankTarget: true,
  smoothScroll: true,
  addHeadingLevel: true,
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
};

/**
 * `config/site.yaml` のスキーマ。
 * 未知のキーは Zod の既定挙動で strip されるため、対応外のキーが含まれていても
 * エラーにはなりません(対応するキーだけが反映されます)。
 * グループ欠損時の既定値は normalize(`site.ts`)で一括補完します。
 */
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
  navigation: z.array(navItemSchema).default([]),
  seo: z
    .object({
      robots: z.string().optional(),
    })
    .optional(),
  content: contentSchema.optional(),
});

export type SiteYaml = z.infer<typeof siteYamlSchema>;

/** `site.yaml` が持っていてもよいトップレベルキー(未対応のものは警告対象) */
export const KNOWN_TOP_LEVEL_KEYS = [
  'site',
  'i18n',
  'categoryMap',
  'social',
  'navigation',
  'seo',
  'content',
] as const;
