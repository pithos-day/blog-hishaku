/**
 * リンクの検出・分類ユーティリティ (markdown 処理用)
 */

import type { RootContent } from 'mdast';

export interface LinkInfo {
  url: string;
  type: 'tweet' | 'youtube' | 'general';
  tweetId?: string;
  youtube?: YouTubeVideo;
}

export interface YouTubeVideo {
  id: string;
  /** 再生開始位置 (秒) */
  start?: number;
  /** ショート動画 (縦長) かどうか */
  isShort: boolean;
}

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'];
const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

/** `t` / `start` パラメータ (`90`, `90s`, `1m30s`, `1h2m3s`) を秒に変換する */
function parseStartTime(value: string | null): number | undefined {
  if (!value) return undefined;
  if (/^\d+s?$/.test(value)) return Number.parseInt(value, 10) || undefined;
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return undefined;
  const [, h = '0', m = '0', sec = '0'] = match;
  const total = Number(h) * 3600 + Number(m) * 60 + Number(sec);
  return total > 0 ? total : undefined;
}

/**
 * YouTube URL から動画 ID と開始位置を抽出
 * 対応形式:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/live/VIDEO_ID
 * - `t` / `start` パラメータ付き
 */
export function extractYouTubeVideo(url: string): YouTubeVideo | null {
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    return null;
  }
  const hostname = urlObj.hostname.toLowerCase();
  const segments = urlObj.pathname.split('/').filter(Boolean);

  let id: string | undefined;
  let isShort = false;
  if (hostname === 'youtu.be') {
    id = segments[0];
  } else if (YOUTUBE_HOSTS.includes(hostname)) {
    if (segments[0] === 'watch') {
      id = urlObj.searchParams.get('v') ?? undefined;
    } else if (['shorts', 'embed', 'live'].includes(segments[0])) {
      id = segments[1];
      isShort = segments[0] === 'shorts';
    }
  }

  if (!id || !YOUTUBE_ID_PATTERN.test(id)) return null;

  const start = parseStartTime(urlObj.searchParams.get('t') ?? urlObj.searchParams.get('start'));
  return { id, isShort, ...(start ? { start } : {}) };
}

/**
 * Twitter/X URL からツイート ID を抽出
 * 対応形式:
 * - https://twitter.com/username/status/1234567890
 * - https://x.com/username/status/1234567890
 * - https://twitter.com/i/web/status/1234567890
 * - クエリパラメータ付き
 */
export function extractTweetId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (!['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'].includes(hostname)) {
      return null;
    }

    const match = urlObj.pathname.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.warn('[Link Embed] URL のパースに失敗:', url, error);
    return null;
  }
}

/** リンクを分類して必要な情報を抽出する */
export function classifyLink(url: string): LinkInfo {
  const tweetId = extractTweetId(url);

  if (tweetId) {
    return { url, type: 'tweet', tweetId };
  }

  const youtube = extractYouTubeVideo(url);
  if (youtube) {
    return { url, type: 'youtube', youtube };
  }

  return { url, type: 'general' };
}

/** URL 表示の比較用に、プロトコル (`https://` など) と末尾スラッシュを取り除く */
function normalizeUrlText(value: string): string {
  return value
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/\/+$/, '');
}

/**
 * 段落が「リンクだけの独行」かどうかを判定する
 * 行内リンク (文中のリンク) は対象外に保つ
 */
export function isStandaloneLinkParagraph(node: RootContent): boolean {
  if (node.type !== 'paragraph') return false;
  if (node.children.length !== 1) return false;

  const child = node.children[0];
  if (child.type !== 'link') return false;

  // リンクの中身がテキスト1つのときだけ「URL 表示か」を判定する
  if (child.children.length === 1) {
    const textNode = child.children[0];
    if (textNode.type === 'text') {
      // 「表示が URL そのものに見えるか」で判定する。
      // プロトコルと末尾スラッシュの表記ゆれだけを吸収して比べるので、
      // <https://…> の自動リンクや example.com / https://example.com/ は URL 表示とみなし、
      // ラベル付きリンク ([docs](https://example.com/docs) のように URL の末尾と
      // 同じ文字列でも) は行内リンクとして対象外のまま残る
      const text = normalizeUrlText(textNode.value);
      return text !== '' && text === normalizeUrlText(child.url);
    }
  }

  return false;
}
