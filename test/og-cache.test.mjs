/**
 * createOGCache の単体テスト。
 *
 * ストアを注入してメモリ上だけで動作を確認する (`.cache/og-data.json` には触れない)。
 * TTL 分岐 (成功 vs エラー) と flush のマージ挙動は並列ビルドでの競合に直結するため固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createOGCache,
  ERROR_CACHE_TTL,
  getSharedOGCache,
  MS_PER_DAY,
} from '../src/lib/markdown/og-cache.ts';

/** 入出力をディープコピーで隔離したインメモリストア */
function makeStore(initial = {}) {
  let data = structuredClone(initial);
  let writeCount = 0;
  return {
    store: {
      read: () => structuredClone(data),
      write(next) {
        writeCount++;
        data = structuredClone(next);
      },
    },
    getData: () => data,
    getWriteCount: () => writeCount,
  };
}

test('og-cache: 未登録 URL の get は null', () => {
  const cache = createOGCache({ successTtl: MS_PER_DAY, store: makeStore().store });
  assert.equal(cache.get('https://example.com/a'), null);
});

test('og-cache: 成功エントリは successTtl の間だけ返る', () => {
  const now = Date.now();
  const store = makeStore({
    'https://fresh/': { data: { title: 'fresh' }, timestamp: now - 1000 },
    'https://stale/': { data: { title: 'stale' }, timestamp: now - MS_PER_DAY * 2 },
  });
  const cache = createOGCache({ successTtl: MS_PER_DAY, store: store.store });
  assert.deepEqual(cache.get('https://fresh/'), { title: 'fresh' });
  assert.equal(cache.get('https://stale/'), null);
});

test('og-cache: エラー data は errorTtl で短く管理される', () => {
  const now = Date.now();
  const store = makeStore({
    'https://ok/': { data: { title: 'ok' }, timestamp: now - 1000 },
    'https://err/': { data: { error: 'fetch failed' }, timestamp: now - 1000 },
  });
  // successTtl は経過済みだが errorTtl は successTtl より長い想定で注入
  const cache = createOGCache({
    successTtl: 1,
    errorTtl: ERROR_CACHE_TTL,
    store: store.store,
  });
  assert.equal(cache.get('https://ok/'), null);
  assert.deepEqual(cache.get('https://err/'), { error: 'fetch failed' });
});

test('og-cache: set はメモリに留め、flush でストアへ書き込む', () => {
  const store = makeStore();
  const cache = createOGCache({ successTtl: MS_PER_DAY, store: store.store });

  cache.set('https://example.com/', { title: 'new' });
  assert.equal(store.getWriteCount(), 0, 'flush 前は書かない');
  assert.equal(store.getData()['https://example.com/'], undefined);

  cache.flush();
  assert.equal(store.getWriteCount(), 1);
  assert.deepEqual(store.getData()['https://example.com/'].data, { title: 'new' });
  assert.deepEqual(cache.get('https://example.com/'), { title: 'new' });
});

test('og-cache: flush は他プロセッサの既存エントリを保持しつつ期限切れを掃除する', () => {
  const now = Date.now();
  const store = makeStore({
    'https://other/': { data: { title: 'other' }, timestamp: now - 1000 },
    'https://expired/': { data: { title: 'expired' }, timestamp: now - MS_PER_DAY * 2 },
  });
  const cache = createOGCache({ successTtl: MS_PER_DAY, store: store.store });

  cache.set('https://mine/', { title: 'mine' });
  cache.flush();

  const written = store.getData();
  assert.deepEqual(Object.keys(written).sort(), ['https://mine/', 'https://other/']);
});

test('og-cache: 変更なしなら flush は書かない', () => {
  const store = makeStore();
  const cache = createOGCache({ successTtl: MS_PER_DAY, store: store.store });
  cache.flush();
  assert.equal(store.getWriteCount(), 0);
});

test('og-cache: 同一 TTL の共有キャッシュは同一インスタンス', () => {
  assert.equal(getSharedOGCache(12345), getSharedOGCache(12345));
  assert.notEqual(getSharedOGCache(12345), getSharedOGCache(54321));
});
