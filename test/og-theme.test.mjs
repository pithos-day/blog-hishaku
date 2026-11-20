/**
 * OGP 画像の配色 (src/lib/og-theme.ts) の単体テスト。
 *
 * 色は global.css のダークテーマから読むため、書式 (hsl の空白区切り・16 進) の解釈と、
 * 実際の global.css から全色が取れることを固定する。
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { mixColors, parseColor, parseThemeColors, toHex } from '../src/lib/og-theme.ts';

const FALLBACK = {
  bg: '#000001',
  surface: '#000002',
  border: '#000003',
  fg: '#000004',
  fgMuted: '#000005',
  accent: '#000006',
};

test('parseColor: hsl (空白区切り・カンマ区切り) と 16 進を読む', () => {
  assert.equal(toHex(parseColor('hsl(220 50.7% 42.9%)')), '#365ba5');
  assert.equal(toHex(parseColor('hsl(0, 0%, 20%)')), '#333333');
  assert.equal(toHex(parseColor('#abc')), '#aabbcc');
  assert.equal(parseColor('var(--x)'), undefined);
});

test('mixColors: color を ratio の割合で base に混ぜる', () => {
  assert.equal(mixColors('#ffffff', '#000000', 0.5), '#808080');
  assert.equal(mixColors('#365ba5', '#eaebec', 0), '#eaebec');
});

test('parseThemeColors: .dark を優先し、無い変数は :root、読めない変数は fallback を使う', () => {
  const css = `:root { --hishaku-fg: hsl(0 0% 20%); --hishaku-surface: #ffffff; --hishaku-accent: var(--x); }
    .dark { --hishaku-surface: #111111; }`;
  assert.deepEqual(parseThemeColors(css, FALLBACK), {
    ...FALLBACK,
    fg: '#333333',
    surface: '#111111',
  });
});

test('同梱の global.css: 全色をダークテーマから読める', () => {
  const css = fs.readFileSync('src/styles/global.css', 'utf8');
  const colors = parseThemeColors(css, FALLBACK);
  for (const [key, value] of Object.entries(colors)) {
    assert.notEqual(value, FALLBACK[key], `${key} が global.css から読めていない`);
  }
  // .dark の --hishaku-accent: hsl(205 77% 70%)
  assert.equal(colors.accent, '#78bced');
});
