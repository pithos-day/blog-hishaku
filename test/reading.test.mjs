/**
 * 読了時間の見積もり (文字種での数え分け) の単体テスト。
 *
 * 漢字・かなは文字数、それ以外は語数で数え、時間を足し合わせる。
 * 言語ごとの数え方と、site.yaml による速度の上書きを固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { configureDefaultLocale, getDefaultLocale } from '../src/i18n/index.ts';
import { parseSiteYaml } from '../src/lib/config/site.ts';
import {
  countReadingUnits,
  countWords,
  estimateReadingMinutes,
  formatTextLength,
} from '../src/lib/reading.ts';

const speed = { charsPerMinute: 400, wordsPerMinute: 230 };

test('countReadingUnits: 日本語は句読点・括弧も含めた文字数で数える', () => {
  assert.deepEqual(countReadingUnits('今日は東京へ行った。', 'ja'), { chars: 10, words: 0 });
  assert.deepEqual(countReadingUnits('「えっ！？」……と言った', 'ja'), { chars: 12, words: 0 });
});

test('countReadingUnits: 英語は語数で数え、半角の句読点は文字数に含めない', () => {
  assert.deepEqual(countReadingUnits("I don't use Vue 3.5 yet.", 'en'), { chars: 0, words: 6 });
});

test('countReadingUnits: 日英混在は文字数と語数に分けて数える', () => {
  assert.deepEqual(countReadingUnits('Astro と Vue で作った', 'ja'), { chars: 5, words: 2 });
});

test('countReadingUnits: 空白で区切らないタイ語も語に分けて数える', () => {
  const { chars, words } = countReadingUnits('สวัสดีครับ', 'th');
  assert.equal(chars, 0);
  assert.equal(words, 2, '1 つの塊ではなく 2 語に分かれる');
});

test('countReadingUnits: 韓国語 (ハングル) は語数で数える', () => {
  assert.deepEqual(countReadingUnits('안녕하세요 반갑습니다', 'ko'), { chars: 0, words: 2 });
});

test('estimateReadingMinutes: 日本語 4,000 字は 10 分', () => {
  assert.equal(estimateReadingMinutes('あ'.repeat(4000), speed, 'ja'), 10);
});

test('estimateReadingMinutes: 英語 1,000 語は 5 分 (文字数で数えると 12 分になっていた)', () => {
  const text = Array.from({ length: 1000 }, () => 'reading').join(' ');
  assert.equal(estimateReadingMinutes(text, speed, 'en'), 5);
});

test('estimateReadingMinutes: 文字と語の時間を足し合わせる', () => {
  const text = `${'あ'.repeat(2000)} ${Array.from({ length: 230 }, () => 'word').join(' ')}`;
  assert.equal(estimateReadingMinutes(text, speed, 'ja'), 6, '5 分 + 1 分');
});

test('estimateReadingMinutes: 空の本文でも最低 1 分', () => {
  assert.equal(estimateReadingMinutes('', speed, 'ja'), 1);
});

const minimal = `
site:
  title: テストサイト
  url: https://example.com/
`;

test('parseSiteYaml: reading 未指定は既定の速度になる', () => {
  assert.deepEqual(parseSiteYaml(minimal).reading, { charsPerMinute: 400, wordsPerMinute: 230 });
});

test('parseSiteYaml: サイト言語が zh なら文字の既定速度が変わる', () => {
  const config = parseSiteYaml(
    `${minimal}i18n:\n  defaultLocale: zh-CN\n  locales:\n    - code: zh-CN\n      label: 中文\n`,
  );
  assert.deepEqual(config.reading, { charsPerMinute: 300, wordsPerMinute: 230 });
});

test('parseSiteYaml: reading の指定は言語ごとの既定値より優先する', () => {
  const config = parseSiteYaml(`${minimal}reading:\n  wordsPerMinute: 200\n`);
  assert.deepEqual(config.reading, { charsPerMinute: 400, wordsPerMinute: 200 });
});

test('parseSiteYaml: reading の速度が 0 以下ならエラーにする', () => {
  assert.throws(() => parseSiteYaml(`${minimal}reading:\n  charsPerMinute: 0\n`), /reading/);
});

test('countWords: 記号を除いた語の数を数える', () => {
  assert.equal(countWords("Hello, world! I don't use Vue 3.5.", 'en'), 7);
});

test('formatTextLength: 英語は語数、日本語は文字数で表示する', () => {
  const stats = { characters: 1200, words: 1, minutes: 3 };
  const original = getDefaultLocale();
  try {
    configureDefaultLocale('en');
    assert.equal(formatTextLength(stats), '1 word');
    assert.equal(formatTextLength({ ...stats, words: 230 }), '230 words');
    configureDefaultLocale('en-US');
    assert.equal(formatTextLength(stats), '1 word', '地域付きのタグでも語数');
    configureDefaultLocale('ja');
    assert.equal(formatTextLength(stats), '1,200文字');
  } finally {
    configureDefaultLocale(original);
  }
});
