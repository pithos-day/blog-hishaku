import rawSiteYaml from '../../../config/site.yaml?raw';
import { parseSiteYaml } from './site';

/** `config/site.yaml` を検証・正規化した設定(単一インスタンス) */
export const siteConfig = parseSiteYaml(rawSiteYaml);

export { parseSiteYaml } from './site';
export type {
  ContentFlags,
  I18nConfig,
  NavItem,
  SiteConfig,
} from './schema';
