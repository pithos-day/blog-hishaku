/**
 * LQIP (Low Quality Image Placeholder) ユーティリティ
 *
 * scripts/generateLqips.ts が生成した .cache/lqips.json を読み込み、
 * 画像パスから CSS グラデーション文字列を返す。
 */

import { loadCacheJson } from './cache';

// .cache/lqips.json が未生成の場合 (pnpm tsx scripts/generateLqips.ts で生成)
const lqips = loadCacheJson<Record<string, string>>('lqips.json', {});

function imagePathToKey(imagePath: string): string {
  return imagePath.replace(/^\/img\//, '');
}

/** compact 形式: 3色×6桁 (# なし)。3点は 135deg グラデーションの 0% / 50% / 100% */
const COMPACT_LENGTH = 18;
const COLOR_LENGTH = 6;

export function getLqipGradient(imagePath: string): string | undefined {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return undefined;
  const compact = lqips[imagePathToKey(imagePath)];
  if (compact?.length !== COMPACT_LENGTH) return undefined;
  const colorAt = (start: number) => `#${compact.slice(start, start + COLOR_LENGTH)}`;
  const topLeft = colorAt(0);
  const topRight = colorAt(COLOR_LENGTH);
  const bottomRight = colorAt(COLOR_LENGTH * 2);
  return `linear-gradient(135deg, ${topLeft} 0%, ${topRight} 50%, ${bottomRight} 100%)`;
}

export function getLqipProps(imagePath: string): { style?: string } {
  const gradient = getLqipGradient(imagePath);
  return gradient ? { style: `background-image:${gradient}` } : {};
}
