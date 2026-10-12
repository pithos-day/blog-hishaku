import rawSiteYaml from '../../../config/site.yaml?raw';
import { configureDefaultLocale } from '../../i18n/config';
import { parseSiteYaml } from './site';

/** `config/site.yaml` を検証・正規化した設定(単一インスタンス) */
export const siteConfig = parseSiteYaml(rawSiteYaml);

// i18n の既定ロケールを site.yaml の値へ反映する (t() が追従する)
configureDefaultLocale(siteConfig.i18n.defaultLocale);

export type {
  ContentOptions,
  I18nConfig,
  SiteConfig,
} from './schema';
export { parseSiteYaml } from './site';
