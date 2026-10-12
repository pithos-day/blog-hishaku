/**
 * i18n (t / 言語フォールバック) の単体テスト。
 *
 * 文言はビルド時にプレースホルダ補完され、既定ロケール辞書が単一の供給元。
 * 補完の残り方と、未知ロケールでもja 辞書へ落ちることを固定する。
 */
import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { configureDefaultLocale, getDefaultLocale, t } from '../src/i18n/index.ts';

after(() => {
  // ファイル冒頭で既定ロケールを変更するテストがあるため念のため戻す
  configureDefaultLocale('ja');
});

test('t: キーだけ指定すると既定辞書の文字列を返す', () => {
  assert.equal(t('common.search'), '検索');
  assert.equal(t('post.charCount', { count: '1,200' }), '1,200文字', '{param} を値で置換する');
});

test('t: パラメータ未指定のときはプレースホルダがそのまま残る', () => {
  assert.equal(t('common.yearMonth'), '{year}年{month}月');
  assert.equal(t('common.yearMonth', { year: 2026, month: 3 }), '2026年3月');
});

test('t: 存在しないロケールでも既定 (ja) 辞書へフォールバックする', () => {
  const original = getDefaultLocale();
  try {
    configureDefaultLocale('unknown-locale');
    assert.equal(t('common.search'), '検索', 'ロケール辞書が無くても既定辞書で返る');
  } finally {
    configureDefaultLocale(original);
  }
  assert.equal(getDefaultLocale(), original, '呼び出し後は元のロケールに戻る');
});
