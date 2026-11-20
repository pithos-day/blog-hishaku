/**
 * i18n (t / 言語フォールバック) の単体テスト。
 *
 * 文言はビルド時にプレースホルダ補完され、既定ロケール辞書が単一の供給元。
 * 補完の残り方と、未知ロケールでもja 辞書へ落ちることを固定する。
 */
import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { configureDefaultLocale, getDefaultLocale, t } from '../src/i18n/index.ts';
import { translations } from '../src/i18n/translations/index.ts';

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

test('t: 既定ロケールを en にすると en 辞書の文字列を返す', () => {
  const original = getDefaultLocale();
  try {
    configureDefaultLocale('en');
    assert.equal(t('common.search'), 'Search');
    assert.equal(t('post.charCount', { count: '1,200' }), '1,200 characters');
  } finally {
    configureDefaultLocale(original);
  }
});

test('t: 数値の count で単数形と複数形を選び、桁区切りで整形する', () => {
  const original = getDefaultLocale();
  try {
    configureDefaultLocale('en');
    assert.equal(t('common.postCount', { count: 0 }), '0 posts');
    assert.equal(t('common.postCount', { count: 1 }), '1 post');
    assert.equal(t('common.postCount', { count: 1200 }), '1,200 posts');
    assert.equal(
      t('common.postCount', { count: '1' }),
      '1 posts',
      '文字列の count は語形を選べず other',
    );
  } finally {
    configureDefaultLocale(original);
  }
  assert.equal(t('common.postCount', { count: 1200 }), '1,200 件', 'ja は語形が 1 つ');
});

// ── 辞書の形式 ───────────────────────────────────────────────
// キーの有無は型で保証されるが、値の中身 (プレースホルダや区切り形式) は型では見えない。

const ja = translations.ja;
const otherLocales = Object.entries(translations).filter(([code]) => code !== 'ja');

/** 辞書の値の全語形 (固定の文言ならそれ自体) */
function formsOf(value) {
  return typeof value === 'string' ? [value] : Object.values(value);
}

/** 文字列中の {param} の名前を、重複を除いて並べる */
function placeholdersOf(value) {
  return [...new Set([...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
}

for (const [code, dict] of otherLocales) {
  test(`辞書 ${code}: ja に無いキーを持たない`, () => {
    const extra = Object.keys(dict).filter((key) => !(key in ja));
    assert.deepEqual(extra, [], 'ja に無いキーは t() から参照されず、消し忘れになる');
  });

  test(`辞書 ${code}: 各キーのプレースホルダが ja と一致する (語形ごとに確認)`, () => {
    for (const [key, value] of Object.entries(dict)) {
      for (const form of formsOf(value)) {
        assert.deepEqual(placeholdersOf(form), placeholdersOf(ja[key]), key);
      }
    }
  });
}

for (const [code, dict] of Object.entries(translations)) {
  test(`辞書 ${code}: 語形のキーはそのロケールの複数形カテゴリで、count を受け取る文言に限る`, () => {
    const categories = new Intl.PluralRules(code).resolvedOptions().pluralCategories;
    for (const [key, value] of Object.entries(dict)) {
      if (typeof value === 'string') continue;
      assert.ok('other' in value, `${key}: other は必須`);
      for (const category of Object.keys(value)) {
        assert.ok(categories.includes(category), `${key}: ${code} に ${category} は無い`);
      }
      assert.ok(
        placeholdersOf(value.other).includes('count'),
        `${key}: count が無いと語形を選べない`,
      );
    }
  });
}

for (const [code, dict] of Object.entries(translations)) {
  test(`辞書 ${code}: calendar.weekdays はカンマ区切りで 7 つの曜日名になる`, () => {
    const value = dict['calendar.weekdays'];
    if (value === undefined) return; // 未定義なら ja にフォールバックする
    const days = value.split(',');
    assert.equal(days.length, 7);
    assert.ok(
      days.every((day) => day.trim() !== ''),
      '空の曜日名が無い',
    );
  });
}
