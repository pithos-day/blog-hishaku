/**
 * AI summary ユーティリティ
 *
 * scripts/generateSummaries.ts が生成した .cache/summaries.json を読み込み、
 * スラッグから要約を返す。未生成なら undefined (要約なしで表示)。
 */

import fs from 'node:fs';
import path from 'node:path';

interface SummaryData {
  title: string;
  summary: string;
}

let summaries: Record<string, SummaryData> = {};

try {
  const cachePath = path.resolve(process.cwd(), '.cache/summaries.json');
  summaries = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as Record<string, SummaryData>;
} catch {
  // .cache/summaries.json が未生成なら要約なしで動作
}

export function getPostSummary(slug: string): string | undefined {
  return summaries[slug]?.summary;
}
