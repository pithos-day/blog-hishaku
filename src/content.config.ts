import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { siteConfig } from './lib/config';
import { parsePostDate } from './lib/date';

/** `_` 始まりのファイル/ディレクトリは除外 */
const BLOG_CONTENT_GLOB_PATTERN = ['**/*.{md,mdx}', '!**/_*/**', '!**/_*.{md,mdx}'];

const dateInSiteTimezone = z
  .union([z.string(), z.date()])
  .transform((value) => parsePostDate(value, siteConfig.site.timezone));

const blogCollection = defineCollection({
  loader: glob({ pattern: BLOG_CONTENT_GLOB_PATTERN, base: './src/content/blog' }),
  schema: z
    .object({
      title: z.string().min(1),
      description: z.string().optional(),
      /** カスタムパーマリンク (省略時はファイル名) */
      link: z.string().optional(),
      date: dateInSiteTimezone,
      updated: dateInSiteTimezone.optional(),
      cover: z.string().optional(),
      tags: z.array(z.string()).optional(),
      /** Hexo 移行互換の副題 */
      subtitle: z.string().optional(),
      /** false でカテゴリツリー/件数から除外 */
      catalog: z.boolean().default(true),
      /** 単一カテゴリ名の配列 (= 階層の鎖)、または複数の鎖 [[a, b], [c]] */
      categories: z
        .array(z.string())
        .or(z.array(z.array(z.string())))
        .optional(),
      sticky: z.boolean().optional(),
      draft: z.boolean().optional(),
      tocNumbering: z.boolean().default(true),
      /** 数式 (KaTeX) を使う記事では true */
      math: z.boolean().optional(),
      keywords: z.array(z.string()).optional(),
      /** 暗号化記事は未対応 (下記 superRefine でビルドエラー) */
      password: z.string().optional(),
    })
    .superRefine((post, ctx) => {
      if (post.password !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message:
            'このテンプレートは記事の暗号化 (password) に対応していません。' +
            'password を削除してからビルドしてください。',
        });
      }
    }),
});

export const collections = {
  blog: blogCollection,
};
