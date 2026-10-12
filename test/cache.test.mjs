/**
 * cache.ts の単体テスト。
 *
 * `.cache/` の読込/書込はビルドを止めないための fail-soft であり、
 * 「未生成でも落ちない」「警告は重複しない」「書いたものを読める」を固定する。
 */
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test, { after } from 'node:test';
import { loadCacheJson, writeCacheJson } from '../src/lib/cache.ts';

const originalCwd = process.cwd();
const workDir = mkdtempSync(path.join(tmpdir(), 'hishaku-cache-'));
process.chdir(workDir);

after(() => {
  process.chdir(originalCwd);
  rmSync(workDir, { recursive: true, force: true });
});

/** console.warn を捕まえて後片付けする */
async function captureWarn(fn) {
  const messages = [];
  const original = console.warn;
  console.warn = (message) => messages.push(message);
  try {
    await fn();
  } finally {
    console.warn = original;
  }
  return messages;
}

test('loadCacheJson: 未生成ファイルはフォールバック値で続行し理由を警告する', async () => {
  const fallback = { default: true };
  const messages = await captureWarn(() => {
    assert.deepEqual(loadCacheJson('missing.json', fallback), fallback, 'フォールバックを返す');
  });
  assert.equal(messages.length, 1);
  assert.match(messages[0], /\.cache\/missing\.json/, '対象パスを出す');
  assert.match(messages[0], /生成コマンド/, '生成方法を案内する');
});

test('loadCacheJson: 同一パスの警告は1回だけ (ログが溢れない)', async () => {
  const messages = await captureWarn(() => {
    loadCacheJson('missing-twice.json', {});
    loadCacheJson('missing-twice.json', {});
  });
  assert.equal(messages.length, 1, '2回目の読み込みは警告しない');
});

test('loadCacheJson: 破損した JSON もフォールバックし理由を変える', async () => {
  mkdirSync('.cache', { recursive: true });
  writeFileSync('.cache/broken.json', '{ not json');
  const messages = await captureWarn(() => {
    assert.deepEqual(loadCacheJson('broken.json', []), []);
  });
  assert.match(messages[0], /読み込みに失敗/, '存在しない場合と区別できる');
});

test('writeCacheJson: 書いた内容を loadCacheJson で読み戻せる', async () => {
  const data = { 'img/a.png': 'aabbcc', nested: { list: [1, 2] } };
  await writeCacheJson('roundtrip.json', data);
  assert.equal(existsSync(path.join(workDir, '.cache/roundtrip.json')), true, '.cache/ 配下に書く');
  assert.deepEqual(loadCacheJson('roundtrip.json', {}), data);
});

test('writeCacheJson: 未作成のサブディレクトリも作って書き込む', async () => {
  await writeCacheJson('deep/nested/entry.json', { ok: true });
  const written = path.join(workDir, '.cache/deep/nested/entry.json');
  assert.equal(existsSync(written), true);
  assert.match(readFileSync(written, 'utf8'), /"ok": true/, '整形済み JSON で書く');
});
