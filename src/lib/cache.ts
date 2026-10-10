/**
 * `.cache/` 配下の生成済み JSON を読む共通ユーティリティ。
 * 未生成・破損時は呼び出し側のフォールバック値で続行する (ビルドを止めない)。
 */

import fs from 'node:fs';
import path from 'node:path';

export function loadCacheJson<T>(filename: string, fallback: T): T {
  try {
    const cachePath = path.resolve(process.cwd(), '.cache', filename);
    return JSON.parse(fs.readFileSync(cachePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}
