import { escapeHtml, sanitizeCssColor } from './escape';

/** `{% links %}` タグ内の 1 件分 */
export interface FriendLinkData {
  site: string;
  url: string;
  owner?: string;
  desc?: string;
  image?: string;
  color?: string;
}

/** `{% media %}` タグ内の 1 件分 */
export interface MediaItem {
  name?: string;
  url?: string;
  title?: string;
  list?: string[];
}

/** フレンドリンクをカードグリッドの HTML にする */
export function renderFriendLinks(items: FriendLinkData[]): string {
  const cards = items
    .map((item) => {
      const safeColor = item.color ? sanitizeCssColor(item.color) : null;
      const style = safeColor ? ` style="border-color: ${escapeHtml(safeColor)}"` : '';
      const image = item.image
        ? `<img class="avatar" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.site)}" loading="lazy" />`
        : '';
      const owner = item.owner ? `<div class="owner">${escapeHtml(item.owner)}</div>` : '';
      const desc = item.desc ? `<div class="desc">${escapeHtml(item.desc)}</div>` : '';
      return (
        `<a class="friend-link-card" href="${escapeHtml(item.url)}"` +
        ` target="_blank" rel="noopener noreferrer"${style}>` +
        `${image}<div class="info"><div class="name">${escapeHtml(item.site)}</div>${owner}${desc}</div></a>`
      );
    })
    .join('\n');
  return `<div class="friend-links-grid">\n${cards}\n</div>`;
}

/**
 * 音声タグをカード形式のリンク一覧にする。
 * (テンプレートは Meting API 連携を含まないため、演奏ではなく楽曲ページへの
 * リンクとして表示する。動画は素の `<video>` で再生できる。)
 */
export function renderAudioMedia(items: MediaItem[]): string {
  const blocks: string[] = [];
  for (const item of items) {
    if (item.list && Array.isArray(item.list) && item.list.length > 0) {
      const title = item.title ? `<div class="media-title">${escapeHtml(item.title)}</div>` : '';
      const links = item.list
        .map(
          (url) =>
            `<li><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></li>`,
        )
        .join('');
      blocks.push(`<div class="audio-card">${title}<ul class="media-list">${links}</ul></div>`);
    } else if (item.url) {
      const label = escapeHtml(item.name ?? item.url);
      blocks.push(
        `<div class="audio-card"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${label}</a></div>`,
      );
    }
  }
  if (blocks.length === 0) return '';
  return `<div class="audio-media">\n${blocks.join('\n')}\n</div>`;
}

/** 動画を素の `<video>` 要素で表示する */
export function renderVideoMedia(items: MediaItem[]): string {
  const videos = items
    .filter((item): item is MediaItem & { url: string } => !!item.url)
    .map((item) => {
      const caption = item.name ? `<figcaption>${escapeHtml(item.name)}</figcaption>` : '';
      return (
        `<figure class="video-media">${caption}` +
        `<video controls preload="metadata" src="${escapeHtml(item.url)}"></video></figure>`
      );
    });
  if (videos.length === 0) return '';
  return videos.join('\n');
}
