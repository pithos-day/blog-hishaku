/**
 * トップページ (記事一覧) のページネーション
 *
 * 1 ページ目は `/`・`/posts/`・`/posts/1/` の 3 URL で表示し、
 * 2 ページ目以降は `/posts/{N}/` を使う (従来の `/2` 形式は廃止)。
 * 末尾スラッシュは canonical / sitemap の表記に合わせている。
 */
import type { Page } from 'astro';
import type { PostEntry } from './posts';

export const POSTS_PAGE_SIZE = 10;

/** 総件数から最終ページ番号を求める (1 件も無くても 1) */
export function calcLastPage(total: number, pageSize: number = POSTS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** 記事一覧の Page オブジェクトを組み立てる (prev は 2 ページ目で `/` に戻る) */
export function buildPostPage(
  posts: PostEntry[],
  currentPage: number,
  pageSize: number = POSTS_PAGE_SIZE,
): Page<PostEntry> {
  const total = posts.length;
  const lastPage = calcLastPage(total, pageSize);
  const start = (currentPage - 1) * pageSize;

  const prev =
    currentPage <= 1 ? undefined : currentPage === 2 ? '/' : `/posts/${currentPage - 1}/`;

  return {
    data: posts.slice(start, start + pageSize),
    start,
    end: Math.min(start + pageSize, total),
    total,
    currentPage,
    size: pageSize,
    lastPage,
    url: {
      current: currentPage === 1 ? '/' : `/posts/${currentPage}/`,
      prev,
      next: currentPage < lastPage ? `/posts/${currentPage + 1}/` : undefined,
      first: currentPage === 1 ? undefined : '/',
      last: currentPage === lastPage ? undefined : `/posts/${lastPage}/`,
    },
  };
}
