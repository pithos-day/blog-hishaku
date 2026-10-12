/**
 * parseSiteYaml の単体テスト。
 *
 * `config/site.yaml` の検証・正規化は astro.config と src の両方の入口。
 * 既定値の補完 (content / i18n) と、設定不備を黙らせないエラー分岐を固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { contentDefaults } from '../src/lib/config/schema.ts';
import { parseSiteYaml } from '../src/lib/config/site.ts';

const minimal = `
site:
  title: テストサイト
  url: https://example.com/
`;

test('parseSiteYaml: 最小構成はスキーマの既定値で埋まる', () => {
  const config = parseSiteYaml(minimal);
  assert.equal(config.site.title, 'テストサイト');
  assert.equal(config.site.timezone, 'Asia/Tokyo', 'timezone 未指定は Asia/Tokyo');
  assert.deepEqual(config.site.keywords, [], 'keywords 未指定は空配列');
  assert.equal(config.i18n.defaultLocale, 'ja');
  assert.deepEqual(config.i18n.locales, [{ code: 'ja', label: '日本語', enabled: true }]);
  assert.deepEqual(config.categoryMap, {});
  assert.deepEqual(config.social, {});
  assert.deepEqual(config.content, contentDefaults, 'content は既定スイッチで満たされる');
});

test('parseSiteYaml: content の指定キーだけが上書きされる', () => {
  const config = parseSiteYaml(`${minimal}content:\n  enableMath: true\n`);
  assert.equal(config.content.enableMath, true, '指定したキーは上書き');
  assert.deepEqual(
    config.content,
    { ...contentDefaults, enableMath: true },
    '未指定キーは既定のまま残る',
  );
});

test('parseSiteYaml: 不正なタイムゾーンはエラーにする', () => {
  const yaml = `${minimal}  timezone: Not/AZone\n`;
  assert.throws(() => parseSiteYaml(yaml), /IANA タイムゾーン/);
});

test('parseSiteYaml: defaultLocale が有効ロケールに無いときはエラーにする', () => {
  const yaml = `${minimal}i18n:\n  defaultLocale: en\n  locales:\n    - code: ja\n      label: 日本語\n      enabled: true\n`;
  assert.throws(() => parseSiteYaml(yaml), /有効なエントリとして存在しません/);
});

test('parseSiteYaml: defaultLocale のロケールが無効 (enabled: false) でもエラー', () => {
  const yaml = `${minimal}i18n:\n  defaultLocale: en\n  locales:\n    - code: en\n      label: English\n      enabled: false\n`;
  assert.throws(() => parseSiteYaml(yaml), /有効なエントリとして存在しません/);
});

test('parseSiteYaml: 必須キーが無いときはエラーに内容を添える', () => {
  assert.throws(
    () => parseSiteYaml('site:\n  url: https://example.com/\n'),
    /形式が不正です[\s\S]*title/,
    '不足キーの path がメッセージに含まれる',
  );
});

test('parseSiteYaml: YAML として解析できないときはエラーにする', () => {
  assert.throws(() => parseSiteYaml('site: ['), /YAML 解析に失敗しました/);
});
