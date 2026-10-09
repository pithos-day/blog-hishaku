import fs from 'node:fs';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { parseSiteYaml } from './src/lib/config/site.ts';

// astro.config は Vite プラグインが有効化される前に読み込まれるため、
// site.yaml は Node の fs で直接読む(パースは src/lib/config と共有)。
function loadSiteConfig() {
  const configPath = path.join(process.cwd(), 'config', 'site.yaml');
  return parseSiteYaml(fs.readFileSync(configPath, 'utf8'));
}

const siteConfig = loadSiteConfig();

export default defineConfig({
  site: siteConfig.site.url,
  vite: {
    plugins: [tailwindcss()],
  },
});
