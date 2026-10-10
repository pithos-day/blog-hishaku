/**
 * AI summary ユーティリティ
 *
 * scripts/generateSummaries.ts が生成した .cache/summaries.json を読み込み、
 * スラッグから要約を返す。未生成なら undefined (要約なしで表示)。
 */

import { loadCacheJson } from './cache';

/** ページ表示用の要約エントリ (.cache/summaries.json と scripts 側で共有) */
export interface SummaryData {
  title: string;
  summary: string;
}

// .cache/summaries.json が未生成なら要約なしで動作
const summaries = loadCacheJson<Record<string, SummaryData>>('summaries.json', {});

export function getPostSummary(slug: string): string | undefined {
  return summaries[slug]?.summary;
}
