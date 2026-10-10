/**
 * 類似記事ユーティリティ
 *
 * scripts/generateSimilarities.ts が生成した .cache/similarities.json を読み込み、
 * スラッグから類似記事リストを返す。未生成なら空配列。
 */

import fs from 'node:fs';
import path from 'node:path';

export interface SimilarPost {
  slug: string;
  title: string;
  score: number;
}

let similarities: Record<string, SimilarPost[]> = {};

try {
  const cachePath = path.resolve(process.cwd(), '.cache/similarities.json');
  similarities = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as Record<string, SimilarPost[]>;
} catch {
  // .cache/similarities.json が未生成なら類似記事なしで動作
}

export function getSimilarPosts(slug: string): SimilarPost[] {
  return similarities[slug] ?? [];
}
