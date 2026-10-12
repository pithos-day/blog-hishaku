/**
 * リンクの検出・分類ユーティリティ (markdown 処理用)
 */

import type { RootContent } from 'mdast';

export interface LinkInfo {
  url: string;
  type: 'tweet' | 'general';
  tweetId?: string;
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

  return { url, type: 'general' };
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

  // リンクテキストが URL 自身 (自動リンク) の場合のみ対象
  if (child.children.length === 1) {
    const textNode = child.children[0];
    if (textNode.type === 'text') {
      const text = textNode.value.trim();
      const url = child.url.trim();
      return text === url || url.endsWith(text) || text.endsWith(url);
    }
  }

  return false;
}
