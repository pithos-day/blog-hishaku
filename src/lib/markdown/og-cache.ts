/**
 * ファイル永続化 OG キャッシュ (`.cache/og-data.json`)
 * 書き込みは既存のディスク状態とマージするため、並列に走る複数の markdown
 * プロセッサ (Astro は複数ファイルを同時処理する) が互いのエントリを消すことがない。
 */

import fs from 'node:fs';
import path from 'node:path';
import type { OGData } from './og-fetcher';

export const DEFAULT_CACHE_TTL_DAYS = 30;
/** エラー項目は早く失効させ、一時的な失敗は次回ビルドで再試行する */
export const ERROR_CACHE_TTL = 1 * 24 * 60 * 60 * 1000;

export interface OGCacheEntry<T = OGData> {
  data: T;
  timestamp: number;
}

export type OGCacheData<T = OGData> = Record<string, OGCacheEntry<T>>;

/** エラー判定: null または `{ error: ... }` 付きオブジェクトは短命キャッシュにする */
function isErrorData(data: unknown): boolean {
  if (data == null) return true;
  return (
    typeof data === 'object' && 'error' in data && Boolean((data as { error?: unknown }).error)
  );
}

/** テスト差し替え用の永続化バックエンド */
export interface OGCacheStore<T = OGData> {
  read(): OGCacheData<T>;
  write(data: OGCacheData<T>): void;
}

export interface OGCache<T = OGData> {
  /** `url` のキャッシュデータ。期限切れなら null */
  get(url: string): T | null;
  /** メモリに記録。永続化には `flush()` を呼ぶ */
  set(url: string, data: T): void;
  /** メモリの変更をストアへマージ (変更なしなら no-op) */
  flush(): void;
}

export interface OGCacheOptions<T = OGData> {
  /** 成功エントリの TTL (ミリ秒) */
  successTtl: number;
  errorTtl?: number;
  store?: OGCacheStore<T>;
}

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'og-data.json');

function createFileCacheStore<T = OGData>(filePath: string = CACHE_FILE): OGCacheStore<T> {
  return {
    read() {
      try {
        if (fs.existsSync(filePath)) {
          return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as OGCacheData<T>;
        }
      } catch (error) {
        console.warn('[Link Embed] キャッシュの読み込みに失敗:', error);
      }
      return {};
    },
    write(data) {
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
      } catch (error) {
        console.warn('[Link Embed] キャッシュの書き込みに失敗:', error);
      }
    },
  };
}

export function createOGCache<T = OGData>({
  successTtl,
  errorTtl = ERROR_CACHE_TTL,
  store = createFileCacheStore<T>(),
}: OGCacheOptions<T>): OGCache<T> {
  const ttlOf = (entry: OGCacheEntry<T>) => (isErrorData(entry.data) ? errorTtl : successTtl);
  const isFresh = (entry: OGCacheEntry<T>, now = Date.now()) =>
    now - entry.timestamp < ttlOf(entry);

  let memory: OGCacheData<T> | null = null;
  const pending = new Set<string>();

  const load = (): OGCacheData<T> => {
    memory ??= store.read();
    return memory;
  };

  return {
    get(url) {
      const entry = load()[url];
      if (!entry) return null;
      return isFresh(entry) ? entry.data : null;
    },

    set(url, data) {
      load()[url] = { data, timestamp: Date.now() };
      pending.add(url);
    },

    flush() {
      if (pending.size === 0 || !memory) return;

      // 他プロセッサの書き込みを保持するため再読込してから自前の変更を上書きする
      const merged: OGCacheData<T> = { ...store.read() };
      for (const url of pending) {
        const entry = memory[url];
        if (entry) merged[url] = entry;
      }

      const now = Date.now();
      const pruned: OGCacheData<T> = {};
      for (const [url, entry] of Object.entries(merged)) {
        if (isFresh(entry, now)) pruned[url] = entry;
      }

      store.write(pruned);
      memory = pruned;
      pending.clear();
    },
  };
}

const sharedCaches = new Map<number, OGCache<unknown>>();

/**
 * プロセス共有のキャッシュ。同じ TTL のプラグインインスタンスが共有するため、
 * 1 ビルド内で URL は 1 回しか取得されない。
 */
export function getSharedOGCache<T = OGData>(successTtl: number): OGCache<T> {
  let cache = sharedCaches.get(successTtl);
  if (!cache) {
    cache = createOGCache<unknown>({ successTtl });
    sharedCaches.set(successTtl, cache);
  }
  return cache as OGCache<T>;
}
