/**
 * 埋め込みリンクの純粋 HTML レンダラ (OG プレビュー / ツイート プレースホルダ)
 * 出力はそのままページに埋め込まれるため、エスケープは必ずここを通して行う。
 */

import sanitizeHtml from 'sanitize-html';
import type { OGData } from './og-fetcher';

/** ユーザー由来テキストから全 HTML タグを取り除く */
function sanitizeText(text: string): string {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
}

/** HTML 属性へ埋め込む値をエスケープする */
function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeAttribute(value: string): string {
  return sanitizeText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** http(s) 以外を捨てて `javascript:` 系のペイロードを防ぐ */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch {
    return '';
  }
}

function sanitizeUrlAttribute(url: string): string {
  return escapeHtmlAttribute(sanitizeUrl(url));
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (error) {
    console.warn('[Link Embed] ドメイン取得に失敗:', url, error);
    return url;
  }
}

/** 取得失敗時やタイトル欠落時のフォールバックカード */
function renderFallbackCard(ogData: OGData, domain: string): string {
  const { originUrl, url, description } = ogData;
  let displayText = domain;
  let subtitle = '';

  try {
    const pathSegments = new URL(url).pathname.split('/').filter((s) => s);

    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment && lastSegment !== 'index.html') {
        displayText = originUrl;
        subtitle = description ?? domain;
      }
    }
  } catch (error) {
    console.warn('[Link Embed] URL から表示テキストを抽出できませんでした:', url, error);
  }

  const safeUrl = sanitizeUrlAttribute(originUrl);
  const safeDisplayText = sanitizeText(displayText);
  const safeSubtitle = subtitle
    ? sanitizeText(subtitle)
    : sanitizeText(originUrl.length > 60 ? `${originUrl.substring(0, 60)}...` : originUrl);

  return `<div class="link-preview-block not-prose" data-state="error">
  <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="hover:border-accent/50 group block rounded-lg border border-border bg-surface p-4 transition-all hover:shadow-md">
    <div class="flex items-center justify-between gap-3">
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <div class="bg-accent/10 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          <svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 6l2 -2c1 -1 3 -1 4 0l1 1c1 1 1 3 0 4l-5 5c1 1 -3 1 -4 0M11 18l-2 2c-1 1 -3 1 -4 0l-1 -1c-1 -1 -1 -3 0 -4l5 -5c1 -1 3 -1 4 0"></path></svg>
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-fg truncate font-medium">${safeDisplayText}</div>
          <div class="text-fg-muted mt-0.5 truncate text-xs">${safeSubtitle}</div>
        </div>
      </div>
      <svg class="text-accent h-5 w-5 shrink-0 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
      </svg>
    </div>
  </a>
</div>`;
}

/** OG リンクプレビューカード (メタデータ欠落時はフォールバックカード) */
export function renderLinkPreview(ogData: OGData): string {
  const { originUrl, url, title, description, image, logo, error } = ogData;
  const domain = getDomain(url);

  if (error || !title) {
    return renderFallbackCard(ogData, domain);
  }

  const safeUrl = sanitizeUrlAttribute(originUrl);
  const safeTitle = sanitizeText(title);
  const safeDescription = description ? sanitizeText(description) : '';
  const safeDomain = sanitizeText(domain);
  const safeTitleAttribute = sanitizeAttribute(title);
  const safeLogo = logo ? sanitizeUrlAttribute(logo) : '';
  const safeImage = image ? sanitizeUrlAttribute(image) : '';
  const safeOriginUrl = sanitizeText(originUrl);

  return `<div class="link-preview-block not-prose" data-state="success">
  <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="group block overflow-hidden rounded-lg border border-border transition-all hover:border-accent/50 hover:shadow-md">
    <div class="bg-surface flex md:flex-col flex-row">
      <div class="flex-1 p-4">
        <div class="mb-2 flex items-center gap-2">
          ${safeLogo ? `<img src="${safeLogo}" alt="" class="h-4 w-4 shrink-0" loading="lazy" aria-hidden="true" referrerpolicy="no-referrer" />` : ''}
          <span class="text-fg-muted truncate text-xs font-medium">${safeDomain}</span>
        </div>
        <div class="text-fg mb-2 line-clamp-2 font-semibold leading-tight">${safeTitle}</div>
        ${safeDescription ? `<p class="text-fg-muted mb-3 line-clamp-2 text-sm">${safeDescription}</p>` : ''}
        <div class="text-accent flex items-center gap-1 text-xs">
          <span class="truncate">${safeOriginUrl}</span>
          <svg class="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" viewBox="0 0 12 12"><path fill="currentColor" d="M4 3.5a.5.5 0 0 0-.5.5v4a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5v-.25a.75.75 0 0 1 1.5 0V8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h.25a.75.75 0 0 1 0 1.5zm2.75 0a.75.75 0 0 1 0-1.5h2.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-.69L7.28 5.78a.75.75 0 0 1-1.06-1.06L7.44 3.5z"/></svg>
        </div>
      </div>
      ${safeImage ? `<div class="link-preview-image-container bg-border relative shrink-0 w-80 md:w-full md:max-h-48 aspect-[1200/630] md:aspect-auto"><img src="${safeImage}" alt="${safeTitleAttribute}" class="link-preview-image h-full w-full object-cover" loading="lazy" referrerpolicy="no-referrer" /></div>` : ''}
    </div>
  </a>
</div>`;
}

/**
 * ツイートのプレースホルダ (クライアント側で水和)。
 * JS 無効時は inner のリンクがそのまま残る。
 */
export function renderTweetEmbed(tweetId: string, url: string): string {
  const safeUrl = sanitizeUrlAttribute(url);
  const safeTweetId = sanitizeAttribute(tweetId);
  return `<div class="tweet-embed not-prose" data-tweet-embed data-tweet-id="${safeTweetId}" data-url="${safeUrl}"><a class="tweet-embed-fallback" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a></div>`;
}
