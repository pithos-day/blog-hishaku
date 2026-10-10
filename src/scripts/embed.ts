/**
 * リンク埋め込みの初期化
 * - ツイート埋め込み: [data-tweet-embed] プレースホルダをビューポート接近時に
 *   Twitter syndication API (react-tweet と同じ) から取得してカード描画
 * - OG カード: 読み込み失敗したプレビュー画像を非表示化
 * JS 無効時はプレースホルダ内のフォールバックリンクがそのまま表示される。
 */

const SYNDICATION_URL = 'https://cdn.syndication.twimg.com/tweet-result';
const TWEET_ID_PATTERN = /^[0-9]+$/;

// react-tweet (fetch-tweet.ts) と同じトークン生成式
function getSyndicationToken(id: string): string {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
}

// react-tweet が送信する features リスト (欠けると 400 になるため固定)
const FEATURES = [
  'tfw_timeline_list:',
  'tfw_follower_count_sunset:true',
  'tfw_tweet_edit_backend:on',
  'tfw_refsrc_session:on',
  'tfw_fosnr_soft_interventions_enabled:on',
  'tfw_show_birdwatch_pivots_enabled:on',
  'tfw_show_business_verified_badge:on',
  'tfw_duplicate_scribes_to_settings:on',
  'tfw_use_profile_image_shape_enabled:on',
  'tfw_show_blue_verified_badge:on',
  'tfw_legacy_timeline_sunset:true',
  'tfw_show_gov_verified_badge:on',
  'tfw_show_business_affiliate_badge:on',
  'tfw_tweet_edit_frontend:on',
].join(';');

interface TweetUrlEntity {
  indices: [number, number];
  url: string;
  expanded_url?: string;
  display_url?: string;
}

interface TweetMediaEntity {
  indices: [number, number];
  media_url_https?: string;
  type?: string;
}

interface TweetEntities {
  urls?: TweetUrlEntity[];
  media?: TweetMediaEntity[];
}

interface TweetUser {
  name?: string;
  screen_name?: string;
  profile_image_url_https?: string;
}

interface TweetResult {
  __typename?: string;
  text?: string;
  created_at?: string;
  entities?: TweetEntities;
  user?: TweetUser;
}

interface TweetPlaceholder {
  element: HTMLElement;
  tweetId: string;
  sourceUrl: string;
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** プレースホルダを「元 URL へのリンク」状態に戻す (取得失敗・非公開・削除) */
function showFallback(element: HTMLElement, message?: string): void {
  const url = element.dataset.url ?? '';
  element.replaceChildren();

  if (message && isSafeHttpUrl(url)) {
    const note = document.createElement('p');
    note.className = 'tweet-card-text tweet-card-unavailable';
    note.textContent = message;
    element.append(note);
  }

  if (isSafeHttpUrl(url)) {
    const link = document.createElement('a');
    link.className = 'tweet-embed-fallback';
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = url;
    element.append(link);
  }
}

/** ツイート本文を安全に構築 (テキストは textContent でエスケープ、URL のみリンク化) */
function buildTweetText(text: string, entities: TweetEntities | undefined): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const urlRanges = [
    ...(entities?.urls ?? []).map((e) => ({ ...e, kind: 'url' as const })),
    ...(entities?.media ?? []).map((e) => ({ ...e, kind: 'media' as const })),
  ].sort((a, b) => a.indices[0] - b.indices[0]);

  let cursor = 0;
  for (const entity of urlRanges) {
    const [start, end] = entity.indices;
    if (start < cursor || start > text.length) continue;

    if (start > cursor) fragment.append(document.createTextNode(text.slice(cursor, start)));

    if (entity.kind === 'url' && entity.expanded_url && isSafeHttpUrl(entity.expanded_url)) {
      const link = document.createElement('a');
      link.href = entity.expanded_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = entity.display_url ?? entity.url;
      fragment.append(link);
    }
    // media の t.co 部分はテキストから除去し、画像は別途表示する

    cursor = end;
  }
  if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));

  return fragment;
}

function formatDate(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** syndication API の応答からツイートカードを構築する */
function renderTweetCard(tweet: TweetResult, sourceUrl: string): HTMLElement {
  const card = document.createElement('a');
  card.className = 'tweet-card';
  card.href = sourceUrl;
  card.target = '_blank';
  card.rel = 'noopener noreferrer';

  const header = document.createElement('div');
  header.className = 'tweet-card-header';

  const user = tweet.user;
  if (user?.profile_image_url_https && isSafeHttpUrl(user.profile_image_url_https)) {
    const avatar = document.createElement('img');
    avatar.className = 'tweet-card-avatar';
    avatar.src = user.profile_image_url_https;
    avatar.alt = '';
    avatar.loading = 'lazy';
    avatar.referrerPolicy = 'no-referrer';
    header.append(avatar);
  }

  const author = document.createElement('div');
  author.className = 'tweet-card-author';
  const name = document.createElement('span');
  name.className = 'tweet-card-name';
  name.textContent = user?.name ?? '';
  const handle = document.createElement('span');
  handle.className = 'tweet-card-handle';
  handle.textContent = user?.screen_name ? `@${user.screen_name}` : '';
  author.append(name, handle);
  header.append(author);

  const logo = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  logo.setAttribute('class', 'tweet-card-logo');
  logo.setAttribute('viewBox', '0 0 24 24');
  logo.setAttribute('aria-hidden', 'true');
  const logoPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  logoPath.setAttribute(
    'd',
    'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  );
  logo.append(logoPath);
  header.append(logo);
  card.append(header);

  if (tweet.text) {
    const body = document.createElement('div');
    body.className = 'tweet-card-text';
    body.append(buildTweetText(tweet.text, tweet.entities));
    card.append(body);
  }

  for (const media of tweet.entities?.media ?? []) {
    if (media.type !== 'photo' || !media.media_url_https || !isSafeHttpUrl(media.media_url_https)) {
      continue;
    }
    const image = document.createElement('img');
    image.className = 'tweet-card-image';
    image.src = media.media_url_https;
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    card.append(image);
  }

  const footer = document.createElement('div');
  footer.className = 'tweet-card-footer';
  if (tweet.created_at) {
    const formatted = formatDate(tweet.created_at);
    if (formatted) {
      const time = document.createElement('time');
      time.className = 'tweet-card-date';
      time.dateTime = tweet.created_at;
      time.textContent = formatted;
      footer.append(time);
    }
  }
  const viewLink = document.createElement('span');
  viewLink.className = 'tweet-card-link';
  viewLink.textContent = 'X で見る';
  footer.append(viewLink);
  card.append(footer);

  return card;
}

async function fetchTweet(id: string): Promise<TweetResult | null> {
  const token = getSyndicationToken(id);
  const url = new URL(SYNDICATION_URL);
  url.searchParams.set('id', id);
  url.searchParams.set('lang', 'en');
  url.searchParams.set('features', FEATURES);
  url.searchParams.set('token', token);

  const response = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
  if (response.status === 404) return null;

  const contentType = response.headers.get('content-type') ?? '';
  if (!response.ok || !contentType.includes('application/json')) return null;

  const data = (await response.json()) as TweetResult | null;
  if (!data || data.__typename === 'TweetTombstone' || Object.keys(data).length === 0) return null;
  return data;
}

async function hydrateTweet(placeholder: TweetPlaceholder): Promise<void> {
  const { element, tweetId, sourceUrl } = placeholder;
  try {
    const tweet = await fetchTweet(tweetId);
    if (!tweet) {
      showFallback(element, 'このツイートは表示できません');
      return;
    }
    element.replaceChildren(renderTweetCard(tweet, sourceUrl));
  } catch {
    // ネットワーク失敗時は元 URL へのリンクを残す
    showFallback(element);
  }
}

function hydrateTweets(): void {
  const placeholders = document.querySelectorAll<HTMLElement>('[data-tweet-embed]');
  if (placeholders.length === 0) return;

  const observers: IntersectionObserver[] = [];

  placeholders.forEach((element) => {
    if (element.dataset.hydrated === 'true') return;
    element.dataset.hydrated = 'true';

    const tweetId = element.dataset.tweetId ?? '';
    const sourceUrl =
      element.dataset.url ||
      (TWEET_ID_PATTERN.test(tweetId) ? `https://x.com/i/status/${tweetId}` : '');
    if (!TWEET_ID_PATTERN.test(tweetId) || tweetId.length > 40 || !sourceUrl) return;

    const placeholder: TweetPlaceholder = { element, tweetId, sourceUrl };

    if (!('IntersectionObserver' in window)) {
      void hydrateTweet(placeholder);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          observers.splice(observers.indexOf(observer), 1);
          void hydrateTweet(placeholder);
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(element);
    observers.push(observer);
  });
}

/** ビルド時取得した OG 画像が読み込めなかったらコンテナごと隠す */
function hideBrokenPreviewImages(): void {
  document.querySelectorAll<HTMLImageElement>('.link-preview-image').forEach((image) => {
    const hide = () => {
      image.closest('.link-preview-image-container')?.classList.add('error');
    };
    if (image.complete && image.naturalWidth === 0) hide();
    else image.addEventListener('error', hide, { once: true });
  });
}

export function initEmbeds(): void {
  hydrateTweets();
  hideBrokenPreviewImages();
}
