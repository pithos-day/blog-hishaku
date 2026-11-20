/**
 * カバー画像を指定していない記事の OGP 画像 (/og/<slug>.png) をビルド時に生成する。
 * 記事ページの og:image / JSON-LD は getPostOgImage() でこのパスを参照する。
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { normalizeCategories } from '@/lib/categories';
import { siteConfig } from '@/lib/config';
import { renderOgImage } from '@/lib/og-image';
import { generatedOgImagePath, getPostSlug, getPublishedPosts, type PostEntry } from '@/lib/posts';

/** サイトのタイムゾーンで 2026.11.20 の形にする (en-CA は言語によらず yyyy-MM-dd を返す) */
function formatOgDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: siteConfig.site.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replaceAll('-', '.');
}

export const getStaticPaths = (async () => {
  const posts = await getPublishedPosts();
  return posts
    .filter((post) => !post.data.cover)
    .map((post) => ({
      // 先頭の /og/ を除いた <slug>.png
      params: { path: generatedOgImagePath(getPostSlug(post)).slice('/og/'.length) },
      props: { post },
    }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ post: PostEntry }> = async ({ props }) => {
  const { post } = props;
  const png = await renderOgImage({
    title: post.data.title,
    // 一番深い (= 具体的な) カテゴリだけを出す
    category: normalizeCategories(post.data.categories)[0]?.at(-1),
    tags: post.data.tags,
    date: formatOgDate(post.data.date),
    siteTitle: siteConfig.site.title,
    avatar: siteConfig.site.avatar,
  });
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
};
