import rawSiteYaml from '../../../config/site.yaml?raw';
import { configureDefaultLocale } from '../../i18n/config';
import { parseSiteYaml } from './site';

/** `config/site.yaml` を検証・正規化した設定(単一インスタンス) */
export const siteConfig = parseSiteYaml(rawSiteYaml);

// サイト表示名 — `name` が無ければ(空文字も含む)`title` へフォールバックする。
// title は schema 上1文字以上の保証があるため、この値が空になることは無い。
// プロフィール・フッター・記事 JSON-LD の著者名はすべてここを参照する。
export const siteDisplayName = siteConfig.site.name || siteConfig.site.title;

// i18n の既定ロケールを site.yaml の値へ反映する (t() が追従する)
configureDefaultLocale(siteConfig.i18n.defaultLocale);
