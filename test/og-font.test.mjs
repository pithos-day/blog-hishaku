/**
 * OGP 画像用フォント選択 (src/lib/og-font.ts) の単体テスト。
 *
 * サブセットの選び漏れは画像の文字化け (豆腐) としてしか表に出ないため、
 * unicode-range の解釈と、描画する文字からのサブセット選択を固定する。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  parseFontFaces,
  parseUnicodeRange,
  pickSubsetsForText,
  stripEmoji,
} from '../src/lib/og-font.ts';

test('parseUnicodeRange: 単一・範囲・ワイルドカードを読む', () => {
  assert.deepEqual(parseUnicodeRange('U+3000-303F, U+4E00,U+4??'), [
    [0x3000, 0x303f],
    [0x4e00, 0x4e00],
    [0x400, 0x4ff],
  ]);
});

test('parseFontFaces: ウェイト・ファイル・範囲を取り出す', () => {
  const css =
    '@font-face{font-family:"X";font-weight:400;src:url("./w/400/000.woff2") format("woff2");unicode-range:U+41-5A}' +
    "@font-face{font-family:'X';font-weight:600;src:url(./w/600/001.woff2);unicode-range:U+3042}";
  assert.deepEqual(parseFontFaces(css), [
    { weight: 400, src: './w/400/000.woff2', ranges: [[0x41, 0x5a]] },
    { weight: 600, src: './w/600/001.woff2', ranges: [[0x3042, 0x3042]] },
  ]);
});

test('pickSubsetsForText: 指定ウェイトで文字を含むサブセットだけを選ぶ', () => {
  const faces = [
    { weight: 400, src: 'latin', ranges: [[0x20, 0x7e]] },
    { weight: 400, src: 'kana', ranges: [[0x3040, 0x30ff]] },
    { weight: 400, src: 'kanji', ranges: [[0x4e00, 0x9fff]] },
    { weight: 600, src: 'kana-600', ranges: [[0x3040, 0x30ff]] },
  ];
  assert.deepEqual(
    pickSubsetsForText(faces, 400, 'Astro の記事').map((face) => face.src),
    ['latin', 'kana', 'kanji'],
  );
  assert.deepEqual(
    pickSubsetsForText(faces, 600, 'ひらがな').map((face) => face.src),
    ['kana-600'],
  );
});

test('同梱の Gen Interface JP: 和文タイトルの文字がすべてサブセットで覆われる', () => {
  const css = fs.readFileSync('public/fonts/gen-interface-jp/gen-interface-jp.css', 'utf8');
  const faces = parseFontFaces(css);
  const text = 'Astroで「ブログ」を作る — 2026年版…';
  for (const weight of [400, 600]) {
    const picked = pickSubsetsForText(faces, weight, text);
    for (const char of text) {
      const cp = char.codePointAt(0);
      assert.ok(
        picked.some((face) => face.ranges.some(([start, end]) => start <= cp && cp <= end)),
        `${weight}: ${char} を含むサブセットが無い`,
      );
    }
  }
});

test('stripEmoji: 絵文字 (ZWJ 結合・異体字セレクタ・肌色・国旗・キーキャップを含む) を除き、空白を詰める', () => {
  assert.equal(stripEmoji('🎉 リリース 👨‍👩‍👧 しました ❤️ 🇯🇵'), 'リリース しました');
  assert.equal(stripEmoji('👍🏽 版 1️⃣ 🏴󠁧󠁢󠁥󠁮󠁧󠁿 ©™'), '版 1');
  assert.equal(stripEmoji('Astro 2026'), 'Astro 2026');
});
