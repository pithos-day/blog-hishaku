/**
 * LQIP (Low Quality Image Placeholder) ユーティリティ
 *
 * scripts/generateLqips.ts が生成した .cache/lqips.json を読み込み、
 * 画像パスから CSS グラデーション文字列を返す。
 */

import fs from 'node:fs';
import path from 'node:path';

let lqips: Record<string, string> = {};

try {
  const cachePath = path.resolve(process.cwd(), '.cache/lqips.json');
  lqips = JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as Record<string, string>;
} catch {
  // .cache/lqips.json が未生成の場合 (pnpm tsx scripts/generateLqips.ts で生成)
}

function imagePathToKey(imagePath: string): string {
  return imagePath.replace(/^\/img\//, '');
}

function getLqipGradient(imagePath: string): string | undefined {
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return undefined;
  const compact = lqips[imagePathToKey(imagePath)];
  if (compact?.length !== 18) return undefined;
  const c1 = `#${compact.slice(0, 6)}`;
  const c2 = `#${compact.slice(6, 12)}`;
  const c3 = `#${compact.slice(12, 18)}`;
  return `linear-gradient(135deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`;
}

export function getLqipProps(imagePath: string): { style?: string } {
  const gradient = getLqipGradient(imagePath);
  return gradient ? { style: `background-image:${gradient}` } : {};
}
