import fs from 'node:fs';
import path from 'node:path';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeSlug from 'rehype-slug';
import remarkMath from 'remark-math';
import { parseSiteYaml } from './src/lib/config/site.ts';
import { rehypeShokaAttrs } from './src/lib/markdown/rehype-attrs.ts';
import { remarkIns, remarkMark } from './src/lib/markdown/remark-effects.ts';
import { remarkShokaPreprocess } from './src/lib/markdown/remark-preprocess.ts';
import { remarkShokaRuby } from './src/lib/markdown/remark-ruby.ts';
import { remarkShokaSpoiler } from './src/lib/markdown/remark-spoiler.ts';
import { shokaMetaTransformer } from './src/lib/markdown/shiki-meta.ts';
import { codeBlockWrapperTransformer } from './src/lib/markdown/shiki-wrapper.ts';

// astro.config は Vite プラグインが有効化される前に読み込まれるため、
// site.yaml は Node の fs で直接読む(パースは src/lib/config と共有)。
function loadSiteConfig() {
  const configPath = path.join(process.cwd(), 'config', 'site.yaml');
  return parseSiteYaml(fs.readFileSync(configPath, 'utf8'));
}

const siteConfig = loadSiteConfig();
const content = siteConfig.content;

// remark プラグイン — 順序が重要:
// 1. remarkShokaPreprocess は必ず先頭 (原文を再パースして GFM 衝突を解消)
// 2. 数式は spoiler/ruby/効果より先に走らせる — $...$ が math ノードへ
//    変換済みなので、それらのテキスト走査プラグインの対象外になる。
// 3. スポイザー → ルビ → 効果 の順でテキストノードを走査
const remarkPlugins = [];
if (content.enableShokaContainers || content.enableShokaHexoTags || content.enableShokaEffects) {
  remarkPlugins.push([
    remarkShokaPreprocess,
    {
      containers: content.enableShokaContainers,
      hexoTags: content.enableShokaHexoTags,
      superSub: content.enableShokaEffects,
      math: content.enableMath,
    },
  ]);
}
if (content.enableMath) remarkPlugins.push(remarkMath);
if (content.enableShokaSpoiler) remarkPlugins.push(remarkShokaSpoiler);
if (content.enableShokaRuby) remarkPlugins.push(remarkShokaRuby);
if (content.enableShokaEffects) remarkPlugins.push(remarkIns, remarkMark);

// rehype プラグイン — 見出しアンカー → 属性構文 → KaTeX
const rehypePlugins = [
  rehypeSlug,
  [
    rehypeAutolinkHeadings,
    {
      behavior: 'append',
      properties: {
        className: ['anchor-link'],
        ariaLabel: 'このセクションへのリンク',
      },
    },
  ],
];
if (content.enableShokaAttrs) rehypePlugins.push(rehypeShokaAttrs);
if (content.enableMath) rehypePlugins.push(rehypeKatex);

// Shiki transformers — meta が data-title 等を付け、wrapper がそれを使って
// ツールバーを組み立てるため、meta を先に登録する。
const shikiTransformers = [];
if (content.enableCodeMeta) shikiTransformers.push(shokaMetaTransformer());
if (content.enhanceCodeBlock) {
  shikiTransformers.push(
    codeBlockWrapperTransformer({
      copy: content.enableCodeCopy,
      fullscreen: content.enableCodeFullscreen,
    }),
  );
}

export default defineConfig({
  site: siteConfig.site.url,
  integrations: [sitemap()],
  markdown: {
    processor: unified({
      gfm: true,
      remarkPlugins,
      rehypePlugins,
    }),
    syntaxHighlight: {
      type: 'shiki',
    },
    shikiConfig: {
      transformers: shikiTransformers,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
