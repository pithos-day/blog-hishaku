/**
 * fxtwitter API からツイートデータを取得する (ビルド時・Node)。
 * syndication API は `access-control-allow-origin` が固定でブラウザから呼べないため、
 * ツイート取得は必ずビルド時に行い、結果は静的 HTML として埋め込む。
 */

const API_BASE = 'https://api.fxtwitter.com/status';
const TIMEOUT_MS = 5000;
export const MAX_PHOTOS = 4;
/** 埋め込み動画の高さ上限。これを超える解像度は重すぎるため選ばない */
const MAX_EMBED_HEIGHT = 720;
const TWEET_ID_PATTERN = /^[0-9]{1,20}$/;

export interface TweetPhoto {
  url: string;
  alt: string;
}

export interface TweetVideo {
  /** 再生用 mp4 (m3u8 は除去し、Web 向けにビットレートを選別済み) */
  url: string;
  /** ポスター画像 */
  posterUrl: string;
  width: number | null;
  height: number | null;
  /** 秒。取得できなければ null (GIF は 0) */
  duration: number | null;
  /** GIF ツイート (音声なし・ループ再生) */
  isGif: boolean;
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
  /** 動画・GIF ツイートのみ (写真付きは null) */
  video: TweetVideo | null;
}

/** selectVideoSource の入力形状 (API レスポンスの videos 配列要素) */
export interface VideoSourceInput {
  type?: string;
  url?: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  duration?: number;
  formats?: Array<{
    url?: string;
    container?: string;
    bitrate?: number;
    height?: number;
  }>;
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
    videos?: VideoSourceInput[];
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

/** formats[].height が無い場合に URL のパス (/1280x720/) から高さを取り出す */
function resolveFormatHeight(format: { height?: number; url?: string }): number {
  if (typeof format.height === 'number' && Number.isFinite(format.height)) return format.height;
  if (typeof format.url !== 'string') return 0;
  const match = format.url.match(/\/(\d{2,5})x(\d{2,5})\//);
  return match ? Number(match[2]) : 0;
}

/** 埋め込み用の再生 mp4 を選ぶ (m3u8 は Chrome で再生できないため対象外) */
export function selectVideoSource(video: VideoSourceInput): TweetVideo | null {
  const mp4Formats = (video.formats ?? []).filter(
    (format) => format.container === 'mp4' && isSafeHttpUrl(format.url),
  );

  // 720p 相当以下を優先 (4K の mp4 をそのまま埋め込むと重すぎる)
  const bounded = mp4Formats.filter((format) => {
    const height = resolveFormatHeight(format);
    return height > 0 && height <= MAX_EMBED_HEIGHT;
  });
  const candidates = bounded.length > 0 ? bounded : mp4Formats;

  const best = candidates.reduce<(typeof candidates)[number] | null>((acc, format) => {
    if (!acc) return format;
    return (format.bitrate ?? 0) > (acc.bitrate ?? 0) ? format : acc;
  }, null);

  const url = best?.url ?? (isSafeHttpUrl(video.url) ? video.url : '');
  if (!url) return null;

  return {
    url,
    posterUrl: isSafeHttpUrl(video.thumbnail_url) ? video.thumbnail_url : '',
    width: typeof video.width === 'number' && Number.isFinite(video.width) ? video.width : null,
    height: typeof video.height === 'number' && Number.isFinite(video.height) ? video.height : null,
    duration:
      typeof video.duration === 'number' && Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : null,
    isGif: video.type === 'gif',
  };
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

  const firstVideo = tweet.media?.videos?.[0];
  const video = firstVideo ? selectVideoSource(firstVideo) : null;

  return {
    url: isSafeHttpUrl(tweet.url) ? tweet.url : '',
    text: typeof tweet.text === 'string' ? tweet.text : '',
    author: {
      name:
        typeof author.name === 'string' && author.name ? author.name : (author.screen_name ?? ''),
      screenName: typeof author.screen_name === 'string' ? author.screen_name : '',
      avatarUrl: isSafeHttpUrl(author.avatar_url) ? author.avatar_url : '',
    },
    createdAt:
      timestamp !== null && Number.isFinite(timestamp)
        ? new Date(timestamp * 1000).toISOString()
        : null,
    photos,
    video,
  };
}
