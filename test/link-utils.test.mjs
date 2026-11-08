/**
 * extractYouTubeVideo / classifyLink の単体テスト。
 *
 * 独行リンクのうち YouTube と判定されたものだけが iframe 埋め込みになる。
 * 判定漏れは OG カードになるだけだが、誤判定は壊れたプレイヤーになるため
 * 対応形式と弾くべき形式の両方を固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyLink, extractYouTubeVideo } from '../src/lib/markdown/link-utils.ts';

const ID = 'dQw4w9WgXcQ';

test('extractYouTubeVideo: 主要な URL 形式から動画 ID を取り出す', () => {
  for (const url of [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&list=PL123`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
  ]) {
    assert.deepEqual(extractYouTubeVideo(url), { id: ID, isShort: false }, url);
  }
});

test('extractYouTubeVideo: ショート動画は isShort になる', () => {
  assert.deepEqual(extractYouTubeVideo(`https://www.youtube.com/shorts/${ID}`), {
    id: ID,
    isShort: true,
  });
});

test('extractYouTubeVideo: t / start パラメータを秒に変換する', () => {
  assert.equal(extractYouTubeVideo(`https://youtu.be/${ID}?t=90`)?.start, 90);
  assert.equal(extractYouTubeVideo(`https://youtu.be/${ID}?t=90s`)?.start, 90);
  assert.equal(extractYouTubeVideo(`https://www.youtube.com/watch?v=${ID}&t=1m30s`)?.start, 90);
  assert.equal(extractYouTubeVideo(`https://youtu.be/${ID}?t=1h2m3s`)?.start, 3723);
  assert.equal(extractYouTubeVideo(`https://www.youtube.com/embed/${ID}?start=42`)?.start, 42);
  assert.equal(extractYouTubeVideo(`https://youtu.be/${ID}?t=0`)?.start, undefined);
  assert.equal(extractYouTubeVideo(`https://youtu.be/${ID}?t=abc`)?.start, undefined);
});

test('extractYouTubeVideo: 動画ページ以外や不正な ID は null', () => {
  for (const url of [
    'https://www.youtube.com/',
    'https://www.youtube.com/@channel',
    'https://www.youtube.com/playlist?list=PL123',
    'https://www.youtube.com/watch?v=short',
    'https://youtu.be/',
    `https://notyoutube.com/watch?v=${ID}`,
    `https://youtube.com.evil.example/watch?v=${ID}`,
    'not a url',
  ]) {
    assert.equal(extractYouTubeVideo(url), null, url);
  }
});

test('classifyLink: YouTube / ツイート / 一般リンクを分類する', () => {
  assert.equal(classifyLink(`https://youtu.be/${ID}`).type, 'youtube');
  assert.equal(classifyLink('https://x.com/jack/status/20').type, 'tweet');
  assert.equal(classifyLink('https://www.youtube.com/@channel').type, 'general');
});
