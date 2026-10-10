/**
 * 独行リンクを埋め込みカードへ変換する remark プラグイン。
 * 段落がリンク 1 個 (テキスト = URL) のみなら検出し、
 * - ツイート → ビルド時に fxtwitter API から取得して静的カード
 * - 一般リンク → ビルド時に OG メタデータを取得して静的カード (`.cache/og-data.json` でキャッシュ)
 * に置き換える。
 */

import type { Html, Link, Paragraph, Root } from 'mdast';
import type { Parent } from 'unist';
import { visit } from 'unist-util-visit';
import { renderLinkPreview, renderTweetCard, renderTweetFallback } from './link-card-template';
import { classifyLink, isStandaloneLinkParagraph } from './link-utils';
import { DEFAULT_CACHE_TTL_DAYS, getSharedOGCache } from './og-cache';
import { fetchOGData } from './og-fetcher';
import type { TweetData } from './tweet-fetcher';
import { fetchTweetData } from './tweet-fetcher';

interface RemarkLinkEmbedOptions {
  enableLinkEmbed?: boolean;
  enableTweetEmbed?: boolean;
  enableOGPreview?: boolean;
  /** 成功エントリのキャッシュ期間 (日数) */
  previewCacheTime?: number;
}

interface EmbedCandidate {
  index: number;
  parent: Parent;
  url: string;
  type: string;
  tweetId?: string;
}

/** 独行リンクを埋め込みカードに変換する (OG 取得はキャッシュ済みを優先) */
export function remarkLinkEmbed(options: RemarkLinkEmbedOptions = {}) {
  const {
    enableLinkEmbed = true,
    enableTweetEmbed = true,
    enableOGPreview = true,
    previewCacheTime = DEFAULT_CACHE_TTL_DAYS,
  } = options;

  // previewCacheTime の単位は日数。秒の時代 (v4 以前) の値が残っていると
  // 約 10 年キャッシュされるため明示的に警告する。
  if (previewCacheTime > 365) {
    console.warn(
      `[Link Embed] previewCacheTime=${previewCacheTime} が大きすぎます。` +
        '単位は日数です — config/site.yaml を確認してください。',
    );
  }

  // OG データとツイートデータを同一ファイルに混在させるため unknown で共有する
  const cache = getSharedOGCache<unknown>(previewCacheTime * 24 * 60 * 60 * 1000);

  /** ツイート: キャッシュ優先でビルド時に取得し、失敗はフォールバックリンクにする */
  const renderTweet = async (tweetId: string, url: string): Promise<string> => {
    const cacheKey = `tweet:${tweetId}`;
    const cached = cache.get(cacheKey) as TweetData | { error: unknown } | null;
    if (cached) {
      return 'error' in cached ? renderTweetFallback(url) : renderTweetCard(cached, url);
    }

    const tweet = await fetchTweetData(tweetId);
    if (tweet) {
      cache.set(cacheKey, tweet);
      return renderTweetCard(tweet, url);
    }
    cache.set(cacheKey, { error: 'fetch failed' });
    return renderTweetFallback(url);
  };

  const renderEmbed = async ({ url, type, tweetId }: EmbedCandidate): Promise<string | null> => {
    if (type === 'tweet' && enableTweetEmbed && tweetId) {
      return renderTweet(tweetId, url);
    }
    if (type === 'general' && enableOGPreview) {
      const cached = cache.get(url) as Parameters<typeof renderLinkPreview>[0] | null;
      if (cached) return renderLinkPreview(cached);

      const ogData = await fetchOGData(url);
      cache.set(url, ogData);
      return renderLinkPreview(ogData);
    }
    return null;
  };

  return async (tree: Root) => {
    if (!enableLinkEmbed || (!enableTweetEmbed && !enableOGPreview)) return;

    const candidates: EmbedCandidate[] = [];

    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      if (index === undefined || !parent) return;
      if (!isStandaloneLinkParagraph(node)) return;

      const { url } = node.children[0] as Link;
      const linkInfo = classifyLink(url);
      candidates.push({
        index,
        parent,
        url,
        type: linkInfo.type,
        tweetId: linkInfo.tweetId,
      });
    });

    const htmlValues = await Promise.all(candidates.map(renderEmbed));

    // 1 ファイルの処理完了時にまとめて保存。マージ書き込みなので
    // 並列プロセッサ同士でエントリが消えることはない。
    cache.flush();

    candidates.forEach(({ index, parent }, i) => {
      const value = htmlValues[i];
      if (!value) return;
      const html: Html = { type: 'html', value };
      parent.children[index] = html;
    });
  };
}
