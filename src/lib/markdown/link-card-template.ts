/**
 * 埋め込みリンクの純粋 HTML レンダラ (OG プレビュー / ツイートカード)
 * 出力はそのままページに埋め込まれるため、エスケープは必ずここを通して行う。
 */

import sanitizeHtml from 'sanitize-html';
import { escapeHtml } from './escape';
import type { OGData } from './og-fetcher';
import type { TweetData } from './tweet-fetcher';

/** ユーザー由来テキストから全 HTML タグを取り除く */
function sanitizeText(text: string): string {
  return sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
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
  return escapeHtml(sanitizeUrl(url));
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
        // `||` は空文字もフォールバックに回す (`??` だと空文字のまま表示される)
        subtitle = description || domain;
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

/** HTML テキストノード向けのエスケープ */
function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TWEET_URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
/** URL 末尾に混入しがちな句読点を切り離す */
const TRAILING_PUNCTUATION = /[.,;:!?)\]}、。」』）！？]+$/;

/** ツイート本文: 全テキストをエスケープし、http(s) URL のみリンク化する */
function renderTweetText(text: string): string {
  let html = '';
  let cursor = 0;

  for (const match of text.matchAll(TWEET_URL_PATTERN)) {
    const start = match.index;
    const raw = match[0];
    const trailing = raw.match(TRAILING_PUNCTUATION)?.[0] ?? '';
    const url = raw.slice(0, raw.length - trailing.length);

    html += escapeText(text.slice(cursor, start));
    if (sanitizeUrl(url)) {
      const safeUrl = escapeHtml(url);
      html += `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeText(url)}</a>`;
    }
    html += escapeText(trailing);
    cursor = start + raw.length;
  }

  html += escapeText(text.slice(cursor));
  return html;
}

function formatTweetDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * ツイートの静的カード (ビルド時に fxtwitter API から取得したデータを描画)。
 */
export function renderTweetCard(tweet: TweetData, sourceUrl: string): string {
  const href = sanitizeUrlAttribute(tweet.url || sourceUrl);
  const safeName = sanitizeText(tweet.author.name);
  const safeHandle = sanitizeText(tweet.author.screenName ? `@${tweet.author.screenName}` : '');
  const safeAvatar = tweet.author.avatarUrl ? sanitizeUrlAttribute(tweet.author.avatarUrl) : '';

  const avatarHtml = safeAvatar
    ? `<img src="${safeAvatar}" alt="" class="tweet-card-avatar" loading="lazy" referrerpolicy="no-referrer" />`
    : '';

  const textHtml = tweet.text
    ? `<div class="tweet-card-text">${renderTweetText(tweet.text)}</div>`
    : '';

  const photosHtml = tweet.photos
    .map((photo) => {
      const safePhotoUrl = sanitizeUrlAttribute(photo.url);
      if (!safePhotoUrl) return '';
      const safeAlt = escapeHtml(sanitizeText(photo.alt));
      return `<img src="${safePhotoUrl}" alt="${safeAlt}" class="tweet-card-image" loading="lazy" referrerpolicy="no-referrer" />`;
    })
    .join('');

  const { createdAt } = tweet;
  const formattedDate = createdAt ? formatTweetDate(createdAt) : null;
  const dateHtml =
    createdAt && formattedDate
      ? `<time class="tweet-card-date" datetime="${escapeHtml(createdAt)}">${escapeText(formattedDate)}</time>`
      : '<span></span>';

  return `<div class="tweet-embed not-prose">
  <a class="tweet-card" href="${href}" target="_blank" rel="noopener noreferrer">
    <div class="tweet-card-header">
      ${avatarHtml}
      <div class="tweet-card-author">
        <span class="tweet-card-name">${safeName}</span>
        <span class="tweet-card-handle">${safeHandle}</span>
      </div>
      <svg class="tweet-card-logo" viewBox="0 0 24 24" aria-hidden="true"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"></path></svg>
    </div>
    ${textHtml}
    ${photosHtml}
    <div class="tweet-card-footer">
      ${dateHtml}
      <span class="tweet-card-link">Twitter で見る</span>
    </div>
  </a>
</div>`;
}

/** ツイート取得失敗時 (削除・非公開・ネットワークエラー) のフォールバック */
export function renderTweetFallback(url: string): string {
  const safeUrl = sanitizeUrlAttribute(url);
  return `<div class="tweet-embed not-prose"><a class="tweet-embed-fallback" href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a></div>`;
}
