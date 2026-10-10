/**
 * `.cache/` 配下の生成済み JSON を読む共通ユーティリティ。
 * 未生成・破損時は呼び出し側のフォールバック値で続行する (ビルドを止めない)。
 */

import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function loadCacheJson<T>(filename: string, fallback: T): T {
  try {
    const cachePath = path.resolve(process.cwd(), '.cache', filename);
    return JSON.parse(readFileSync(cachePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

/** JSON を整形してファイルへ書き込む (親ディレクトリを作成) */
export async function writeCacheJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
