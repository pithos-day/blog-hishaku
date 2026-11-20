/**
 * frontmatter-dates.ts の単体テスト。
 *
 * YAML が Date に変換する前の日付文字列を取り出せることを固定する
 * (オフセット付き日時がサイトのタイムゾーンで二重に補正されないための前提)。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePostDate } from '../src/lib/date.ts';
import { readRawDateFields } from '../src/lib/frontmatter-dates.ts';

test('readRawDateFields: 引用符なしの日時を文字列のまま返す', () => {
  const source =
    '---\ntitle: x\ndate: 2026-10-01T09:30:00+09:00\nupdated: 2026-10-02 08:00:00\n---\n本文';
  assert.deepEqual(readRawDateFields(source), {
    date: '2026-10-01T09:30:00+09:00',
    updated: '2026-10-02 08:00:00',
  });
});

test('readRawDateFields: CRLF と BOM の frontmatter も読む', () => {
  assert.deepEqual(readRawDateFields('﻿---\r\ndate: 2026-10-01\r\n---\r\n'), {
    date: '2026-10-01',
  });
});

test('readRawDateFields: frontmatter が無い・壊れている・日付が無いときは空', () => {
  assert.deepEqual(readRawDateFields('本文だけ'), {});
  assert.deepEqual(readRawDateFields('---\ndate: [\n---\n'), {});
  assert.deepEqual(readRawDateFields('---\ntitle: x\n---\n'), {});
});

test('readRawDateFields + parsePostDate: オフセット付き日時はオフセットどおりに解釈する', () => {
  const { date } = readRawDateFields('---\ndate: 2026-10-01T08:00:00+09:00\n---\n');
  assert.equal(parsePostDate(date, 'Asia/Tokyo').toISOString(), '2026-09-30T23:00:00.000Z');
});
