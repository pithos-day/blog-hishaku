/**
 * ビルド時の Open Graph メタデータ取得 (fetch + metascraper)
 * 常に throw せず、失敗時は error フィールド付きで返す (呼び出し側はキャッシュに保存できる)。
 */

import metascraper from 'metascraper';
import metascraperDescription from 'metascraper-description';
import metascraperImage from 'metascraper-image';
import metascraperLogo from 'metascraper-logo';
import metascraperLogoFavicon from 'metascraper-logo-favicon';
import metascraperTitle from 'metascraper-title';
import metascraperUrl from 'metascraper-url';

export interface OGData {
  originUrl: string;
  url: string;
  title?: string;
  description?: string;
  image?: string;
  logo?: string;
  error?: string;
  author?: string;
}

const TIMEOUT_MS = 5000;

// favicon プローブは got 系のリトライで "promise settled 後の onCancel" 例外が
// ビルドを落とすため、リトライなし・上限時間つきで 1 回だけ試す。
const FAVICON_PROBE = { retry: 0, timeout: TIMEOUT_MS };

const scraper = metascraper([
  metascraperDescription(),
  metascraperImage(),
  metascraperLogo(),
  metascraperTitle(),
  metascraperUrl(),
  metascraperLogoFavicon({ gotOpts: FAVICON_PROBE }),
]);

/** URL の OG メタデータをビルド時に取得する (タイムアウト付き) */
export async function fetchOGData(url: string): Promise<OGData> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let html: string;
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(`[Link Embed] 取得失敗 ${url}: ${response.status}`);
        return { originUrl: url, url, error: `Failed to fetch: ${response.status}` };
      }

      // タイムアウトは本文の読み込み完了まで有効にする
      html = await response.text();
    } finally {
      clearTimeout(timeoutId);
    }
    const metadata = await scraper({ html, url });

    return {
      originUrl: url,
      url: metadata.url || url,
      title: metadata.title,
      description: metadata.description,
      image: metadata.image,
      logo: metadata.logo || metadata.favicon,
      author: metadata.author || metadata.publisher,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`[Link Embed] タイムアウト: ${url}`);
      return { originUrl: url, url, error: 'Request timeout' };
    }
    console.warn(`[Link Embed] 取得エラー ${url}:`, error);
    return {
      originUrl: url,
      url,
      error: error instanceof Error ? error.message : 'Failed to fetch',
    };
  }
}
