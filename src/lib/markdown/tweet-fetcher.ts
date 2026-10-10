/**
 * fxtwitter API からツイートデータを取得する (ビルド時・Node)。
 * syndication API は `access-control-allow-origin` が固定でブラウザから呼べないため、
 * ツイート取得は必ずビルド時に行い、結果は静的 HTML として埋め込む。
 */

const API_BASE = 'https://api.fxtwitter.com/status';
const TIMEOUT_MS = 5000;
const MAX_PHOTOS = 4;
const TWEET_ID_PATTERN = /^[0-9]{1,20}$/;

export interface TweetPhoto {
  url: string;
  alt: string;
}

export interface TweetData {
  /** 正規のツイート URL (x.com) */
  url: string;
  text: string;
  author: {
    name: string;
    screenName: string;
    avatarUrl: string;
  };
  /** ISO 8601 (取得できなければ null) */
  createdAt: string | null;
  photos: TweetPhoto[];
}

interface FxPhoto {
  type?: string;
  url?: string;
  altText?: string;
}

interface FxTweet {
  url?: string;
  text?: string;
  created_timestamp?: number;
  author?: {
    name?: string;
    screen_name?: string;
    avatar_url?: string;
  };
  media?: {
    photos?: FxPhoto[];
  };
}

interface FxResponse {
  code?: number;
  tweet?: FxTweet;
}

function isSafeHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** 取得失敗・非公開・削除済みはすべて null (呼び出し側がフォールバックを描画する) */
export async function fetchTweetData(id: string): Promise<TweetData | null> {
  if (!TWEET_ID_PATTERN.test(id)) return null;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${id}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    console.warn(`[Link Embed] ツイート取得エラー ${id}:`, error);
    return null;
  }

  if (!response.ok) return null;

  let body: FxResponse;
  try {
    body = (await response.json()) as FxResponse;
  } catch {
    return null;
  }

  if (body.code !== 200 || !body.tweet) return null;

  const tweet = body.tweet;
  const author = tweet.author ?? {};
  const timestamp = typeof tweet.created_timestamp === 'number' ? tweet.created_timestamp : null;

  const photos: TweetPhoto[] = (tweet.media?.photos ?? [])
    .filter((photo) => photo.type === 'photo' && isSafeHttpUrl(photo.url))
    .slice(0, MAX_PHOTOS)
    .map((photo) => ({
      url: photo.url as string,
      alt: typeof photo.altText === 'string' ? photo.altText : '',
    }));

  return {
    url: isSafeHttpUrl(tweet.url) ? tweet.url : '',
    text: typeof tweet.text === 'string' ? tweet.text : '',
    author: {
      name:
        typeof author.name === 'string' && author.name ? author.name : (author.screen_name ?? ''),
      screenName: typeof author.screen_name === 'string' ? author.screen_name : '',
      avatarUrl: isSafeHttpUrl(author.avatar_url) ? (author.avatar_url as string) : '',
    },
    createdAt:
      timestamp !== null && Number.isFinite(timestamp)
        ? new Date(timestamp * 1000).toISOString()
        : null,
    photos,
  };
}
