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
import { countReadingUnits, estimateReadingMinutes, formatTextLength } from '../src/lib/reading.ts';

const speed = { charsPerMinute: 400, wordsPerMinute: 230 };

/** 本文を数えてから既定の速度で読了時間を見積もる */
const minutesOf = (text, locale) => estimateReadingMinutes(countReadingUnits(text, locale), speed);

test('countReadingUnits: 日本語は句読点・括弧も含めた文字数で数える', () => {
  assert.deepEqual(countReadingUnits('今日は東京へ行った。', 'ja'), {
    cjkChars: 10,
    nonCjkWords: 0,
    allWords: 7,
  });
  assert.deepEqual(countReadingUnits('「えっ！？」……と言った', 'ja'), {
    cjkChars: 12,
    nonCjkWords: 0,
    allWords: 5,
  });
});

test('countReadingUnits: 英語は語数で数え、半角の句読点は文字数に含めない', () => {
  assert.deepEqual(countReadingUnits("I don't use Vue 3.5 yet.", 'en'), {
    cjkChars: 0,
    nonCjkWords: 6,
    allWords: 6,
  });
});

test('countReadingUnits: 日英混在は文字数と語数に分けて数える', () => {
  assert.deepEqual(countReadingUnits('Astro と Vue で作った', 'ja'), {
    cjkChars: 5,
    nonCjkWords: 2,
    allWords: 7,
  });
});

test('countReadingUnits: 空白で区切らないタイ語も語に分けて数える', () => {
  const { cjkChars, nonCjkWords } = countReadingUnits('สวัสดีครับ', 'th');
  assert.equal(cjkChars, 0);
  assert.equal(nonCjkWords, 2, '1 つの塊ではなく 2 語に分かれる');
});

test('countReadingUnits: 韓国語 (ハングル) は語数で数える', () => {
  assert.deepEqual(countReadingUnits('안녕하세요 반갑습니다', 'ko'), {
    cjkChars: 0,
    nonCjkWords: 2,
    allWords: 2,
  });
});

test('estimateReadingMinutes: 日本語 4,000 字は 10 分', () => {
  assert.equal(minutesOf('あ'.repeat(4000), 'ja'), 10);
});

test('estimateReadingMinutes: 英語 1,000 語は 5 分 (文字数で数えると 12 分になっていた)', () => {
  const text = Array.from({ length: 1000 }, () => 'reading').join(' ');
  assert.equal(minutesOf(text, 'en'), 5);
});

test('estimateReadingMinutes: 文字と語の時間を足し合わせる', () => {
  const text = `${'あ'.repeat(2000)} ${Array.from({ length: 230 }, () => 'word').join(' ')}`;
  assert.equal(minutesOf(text, 'ja'), 6, '5 分 + 1 分');
});

test('estimateReadingMinutes: 空の本文でも最低 1 分', () => {
  assert.equal(minutesOf('', 'ja'), 1);
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
  const config = parseSiteYaml(`${minimal}i18n:\n  defaultLocale: zh-CN\n`);
  assert.deepEqual(config.reading, { charsPerMinute: 300, wordsPerMinute: 230 });
});

test('parseSiteYaml: reading の指定は言語ごとの既定値より優先する', () => {
  const config = parseSiteYaml(`${minimal}reading:\n  wordsPerMinute: 200\n`);
  assert.deepEqual(config.reading, { charsPerMinute: 400, wordsPerMinute: 200 });
});

test('parseSiteYaml: reading の速度が 0 以下ならエラーにする', () => {
  assert.throws(() => parseSiteYaml(`${minimal}reading:\n  charsPerMinute: 0\n`), /reading/);
});

test('countReadingUnits: allWords は記号を除いたすべての語の数', () => {
  assert.equal(countReadingUnits("Hello, world! I don't use Vue 3.5.", 'en').allWords, 7);
  assert.equal(
    countReadingUnits('Astro と Vue で作った', 'ja').allWords,
    7,
    '漢字・かなの語も数える',
  );
});

test('formatTextLength: 英語は語数、日本語は文字数で表示する', () => {
  const stats = { characters: 1200, words: 1, minutes: 3 };
  const original = getDefaultLocale();
  try {
    configureDefaultLocale('en');
    assert.equal(formatTextLength(stats), '1 word');
    assert.equal(formatTextLength({ ...stats, words: 230 }), '230 words');
    configureDefaultLocale('ja');
    assert.equal(formatTextLength(stats), '1,200文字');
  } finally {
    configureDefaultLocale(original);
  }
});
