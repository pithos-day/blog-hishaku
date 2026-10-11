/**
 * selectVideoSource の単体テスト。
 *
 * 埋め込み動画は m3u8 (Chrome で再生不可) ではなく mp4 を選び、
 * 4K より 720p 相当以下を優先する。選定を誤るとページが重くなったり
 * 再生できなくなったりするため境界を固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { selectVideoSource } from '../src/lib/markdown/tweet-fetcher.ts';

/** mp4 フォーマットの省略記法 */
const mp4 = (url, bitrate, height) => ({ url, container: 'mp4', bitrate, height });

/** 実 API の mp4 フォーマット (height は入らない。解像度は URL のパスに含まれる) */
const mp4FromUrl = (path, bitrate) => ({
  url: `https://video.twimg.com/avc1/${path}/clip.mp4`,
  container: 'mp4',
  bitrate,
});

const M3U8 = { url: 'https://video.twimg.com/live.m3u8', container: 'm3u8' };

test('height の無い formats は URL から高さを読み取って 720p 以下を選ぶ (実 API 形状)', () => {
  const video = selectVideoSource({
    url: 'https://video.twimg.com/avc1/3840x2160/4k.mp4',
    thumbnail_url: 'https://pbs.twimg.com/thumb.jpg',
    width: 3840,
    height: 2160,
    duration: 24,
    formats: [
      M3U8,
      mp4FromUrl('480x270', 256000),
      mp4FromUrl('1280x720', 2176000),
      mp4FromUrl('3840x2160', 25128000),
    ],
  });

  assert.equal(video.url, 'https://video.twimg.com/avc1/1280x720/clip.mp4');
  assert.equal(video.posterUrl, 'https://pbs.twimg.com/thumb.jpg');
  assert.equal(video.width, 3840);
  assert.equal(video.height, 2160);
  assert.equal(video.duration, 24);
  assert.equal(video.isGif, false);
});

test('formats[].height がある場合はそれを優先して 720p 以下を選ぶ', () => {
  const video = selectVideoSource({
    formats: [
      M3U8,
      mp4('https://video.twimg.com/270.mp4', 256000, 270),
      mp4('https://video.twimg.com/360.mp4', 832000, 360),
      mp4('https://video.twimg.com/720.mp4', 2176000, 720),
      mp4('https://video.twimg.com/1080.mp4', 10368000, 1080),
      mp4('https://video.twimg.com/2160.mp4', 25128000, 2160),
    ],
  });

  assert.equal(video.url, 'https://video.twimg.com/720.mp4');
});

test('720p 以下の mp4 がなければ mp4 の中から最高ビットレートを選ぶ', () => {
  const video = selectVideoSource({
    formats: [
      M3U8,
      mp4('https://video.twimg.com/1080.mp4', 1000, 1080),
      mp4('https://video.twimg.com/2160.mp4', 2000, 2160),
    ],
  });

  assert.equal(video.url, 'https://video.twimg.com/2160.mp4');
});

test('formats がなければ url を再生源にする (GIF)', () => {
  const video = selectVideoSource({
    type: 'gif',
    url: 'https://video.twimg.com/tweet_video/abc.mp4',
    thumbnail_url: 'https://pbs.twimg.com/tweet_video_thumb/abc.jpg',
    width: 498,
    height: 278,
    duration: 0,
  });

  assert.equal(video.url, 'https://video.twimg.com/tweet_video/abc.mp4');
  assert.equal(video.isGif, true);
  assert.equal(video.duration, null);
});

test('m3u8 しかなければ再生源なし (null)', () => {
  assert.equal(selectVideoSource({ formats: [M3U8] }), null);
  assert.equal(selectVideoSource({}), null);
});

test('http(s) 以外の URL は捨てる', () => {
  assert.equal(selectVideoSource({ url: 'javascript:alert(1)' }), null);
  assert.equal(selectVideoSource({ formats: [mp4('javascript:alert(1)', 100, 360)] }), null);
});
