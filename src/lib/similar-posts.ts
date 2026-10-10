/**
 * 類似記事ユーティリティ
 *
 * scripts/generateSimilarities.ts が生成した .cache/similarities.json を読み込み、
 * スラッグから類似記事リストを返す。未生成なら空配列。
 */

import { loadCacheJson } from './cache';

export interface SimilarPost {
  slug: string;
  title: string;
  similarity: number;
}

// .cache/similarities.json が未生成なら類似記事なしで動作
const similarities = loadCacheJson<Record<string, SimilarPost[]>>('similarities.json', {});

export function getSimilarPosts(slug: string): SimilarPost[] {
  return similarities[slug] ?? [];
}
