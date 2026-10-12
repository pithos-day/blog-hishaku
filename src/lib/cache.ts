/**
 * `.cache/` 配下の生成済み JSON を読む共通ユーティリティ。
 * 未生成・破損時は呼び出し側のフォールバック値で続行する (ビルドを止めない)。
 * ただし黙って続行すると機能が静かに消えるため、失敗時は理由を必ず出力する。
 */

import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const warnedPaths = new Set<string>();

function warnOnce(message: string, key: string): void {
  if (warnedPaths.has(key)) return;
  warnedPaths.add(key);
  console.warn(message);
}

/** `.cache/` 配下のキャッシュファイルへのパスを組み立てる (読む/書くで同じ基準) */
function cacheFilePath(filename: string): string {
  return path.resolve(process.cwd(), '.cache', filename);
}

export function loadCacheJson<T>(filename: string, fallback: T): T {
  const cachePath = cacheFilePath(filename);
  try {
    return JSON.parse(readFileSync(cachePath, 'utf-8')) as T;
  } catch (error) {
    const isMissing = (error as NodeJS.ErrnoException)?.code === 'ENOENT';
    const reason = isMissing
      ? 'ファイルが存在しません。生成コマンド (pnpm generate:lqips / generate:similarities) を実行してください。'
      : `読み込みに失敗しました: ${error}`;
    warnOnce(
      `[cache] ${cachePath} ${reason} 該当機能は無効のままビルドを続けます。`,
      `${cachePath}:${String(isMissing)}`,
    );
    return fallback;
  }
}

/**
 * `.cache/` 配下へ JSON を整形して書き込む。
 * `filename` は loadCacheJson と同じ `.cache/` 基準 (親ディレクトリは作成)。
 */
export async function writeCacheJson(filename: string, value: unknown): Promise<void> {
  const cachePath = cacheFilePath(filename);
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, `${JSON.stringify(value, null, 2)}\n`);
}
