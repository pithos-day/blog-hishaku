import type { APIContext } from 'astro';
import { siteConfig } from '@/lib/config';

export function GET(context: APIContext): Response {
  const origin = context.site ?? new URL(siteConfig.site.url);
  const lines = ['User-agent: *', 'Allow: /'];
  if (siteConfig.seo.robots) {
    lines.push(siteConfig.seo.robots);
  }
  lines.push('', `Sitemap: ${new URL('sitemap-index.xml', origin)}`, '');
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
