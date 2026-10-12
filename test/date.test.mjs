/**
 * date.ts の単体テスト。
 *
 * 日付はサイトタイムゾーン基準で解釈され、DST のあるタイムゾーンでは
 * 2 段近似でオフセットを詰める。境界 (冬/夏・日付の切り替わり) を固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatDate,
  getTimezoneOffsetMs,
  getYearMonth,
  parsePostDate,
  reinterpretUtcAsTimezone,
} from '../src/lib/date.ts';

const HOUR = 3600_000;

test('getTimezoneOffsetMs: 東経は東 (+9h) で DST の無い季節でも変わらない', () => {
  assert.equal(getTimezoneOffsetMs('Asia/Tokyo', new Date('2026-01-15T00:00:00Z')), 9 * HOUR);
  assert.equal(getTimezoneOffsetMs('Asia/Tokyo', new Date('2026-07-15T00:00:00Z')), 9 * HOUR);
});

test('getTimezoneOffsetMs: DST のある TZ は季節でオフセットが変わる', () => {
  assert.equal(
    getTimezoneOffsetMs('America/New_York', new Date('2026-01-15T12:00:00Z')),
    -5 * HOUR,
    '冬 (EST) は -5h',
  );
  assert.equal(
    getTimezoneOffsetMs('America/New_York', new Date('2026-07-15T12:00:00Z')),
    -4 * HOUR,
    '夏 (EDT) は -4h',
  );
});

test('reinterpretUtcAsTimezone: 壁時計時刻をサイト TZ の絶対時刻へ読み替える', () => {
  // 2026-01-01 15:00 を東京の壁時計として扱う → 実時刻は 06:00Z
  const actual = reinterpretUtcAsTimezone(new Date(Date.UTC(2026, 0, 1, 15, 0, 0)), 'Asia/Tokyo');
  assert.equal(actual.getTime(), Date.UTC(2026, 0, 1, 6, 0, 0));
});

test('reinterpretUtcAsTimezone: DST 期間でも 2 段近似で正しい時刻になる', () => {
  const summer = reinterpretUtcAsTimezone(
    new Date(Date.UTC(2026, 6, 1, 12, 0, 0)),
    'America/New_York',
  );
  assert.equal(summer.getTime(), Date.UTC(2026, 6, 1, 16, 0, 0), '夏 (EDT) は 12:00 → 16:00Z');

  const winter = reinterpretUtcAsTimezone(
    new Date(Date.UTC(2026, 0, 1, 12, 0, 0)),
    'America/New_York',
  );
  assert.equal(winter.getTime(), Date.UTC(2026, 0, 1, 17, 0, 0), '冬 (EST) は 12:00 → 17:00Z');
});

test('parsePostDate: Date オブジェクトはサイト TZ の壁時計として再解釈する', () => {
  const parsed = parsePostDate(new Date(Date.UTC(2026, 0, 1, 15, 0, 0)), 'Asia/Tokyo');
  assert.equal(parsed.getTime(), Date.UTC(2026, 0, 1, 6, 0, 0));
});

test('parsePostDate: 日付のみ・日時付きの文字列はサイト TZ の壁時計時刻', () => {
  const dateOnly = parsePostDate('2026-01-01', 'Asia/Tokyo');
  assert.equal(dateOnly.getTime(), Date.UTC(2025, 11, 31, 15, 0, 0), '東京の0時 → 前日 15:00Z');

  const withTime = parsePostDate('2026-01-01 12:34:56', 'Asia/Tokyo');
  assert.equal(withTime.getTime(), Date.UTC(2026, 0, 1, 3, 34, 56));
});

test('parsePostDate: オフセット付き文式は絶対時刻として解釈する (TZ 非依存)', () => {
  const withOffset = parsePostDate('2026-01-01T09:00:00+09:00', 'America/New_York');
  assert.equal(withOffset.getTime(), Date.UTC(2026, 0, 1, 0, 0, 0));

  const utc = parsePostDate('2026-01-01T15:00:00Z', 'Asia/Tokyo');
  assert.equal(utc.getTime(), Date.UTC(2026, 0, 1, 15, 0, 0));
});

test('parsePostDate: 小数秒はミリ秒へ丸めて保持する', () => {
  const withFraction = parsePostDate('2026-01-01T15:00:00.250Z', 'Asia/Tokyo');
  assert.equal(withFraction.getTime(), Date.UTC(2026, 0, 1, 15, 0, 0) + 250);
});

test('parsePostDate: 不正な値はエラーにする (黙って補完しない)', () => {
  assert.throws(() => parsePostDate('not-a-date', 'Asia/Tokyo'), /解析できません/);
  assert.throws(() => parsePostDate(new Date('invalid'), 'Asia/Tokyo'), /不正な Date/);
});

test('formatDate: サイト TZ 基準でja-JP書式に整形する', () => {
  const formatted = formatDate(new Date('2026-01-01T15:00:00Z'), 'Asia/Tokyo');
  assert.equal(formatted, '2026年1月2日', ' UTC 15:00 は東京では翌日');
});

test('getYearMonth: TZ で年月が変わる瞬間 (日付境界) を正しく返す', () => {
  const edge = new Date('2026-01-31T16:00:00Z');
  assert.deepEqual(
    getYearMonth(edge, 'Asia/Tokyo'),
    { year: 2026, month: 2 },
    '東京では 2/1 01:00',
  );
  assert.deepEqual(getYearMonth(edge, 'UTC'), { year: 2026, month: 1 }, 'UTC では 1/31');
});
