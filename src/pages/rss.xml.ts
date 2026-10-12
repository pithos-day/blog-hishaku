import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { siteConfig } from '@/lib/config';
import { getPostDescription, getPostSlug, getPublishedPosts, postPath } from '@/lib/posts';

export async function GET(context: APIContext): Promise<Response> {
  const posts = await getPublishedPosts();
  return rss({
    title: siteConfig.site.title,
    description: siteConfig.site.description ?? '',
    site: context.site ?? siteConfig.site.url,
    customData: `<language>${siteConfig.i18n.defaultLocale}</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: getPostDescription(post),
      link: postPath(getPostSlug(post)),
      categories: post.data.tags,
    })),
  });
}
