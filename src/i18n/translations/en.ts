/**
 * English (en) — UI 文字列
 *
 * ja.ts と同じキーをすべて持つ。DefaultUIStrings で型付けしているため、
 * ja.ts にキーを足したらここにも訳を足さないと型エラーになる。
 * 数で語形が変わる文言は { one, other } で書き、t() が count から選ぶ。
 */

import type { DefaultUIStrings } from '../types';

const NO_POSTS = 'No posts yet.';
const SEARCH_PLACEHOLDER = 'Search posts…';

export const uiStrings: DefaultUIStrings = {
  // ── 共通 ─────────────────────────────────────────────────────
  'common.search': 'Search',
  'common.close': 'Close',
  'common.themeToggle': 'Toggle theme',
  'common.breadcrumb': 'Breadcrumb',
  'common.home': 'Home',
  'common.yearMonth': '{year}/{month}',
  'common.postCount': { one: '{count} post', other: '{count} posts' },
  'common.noPosts': NO_POSTS,
  'common.lightboxAria': 'Enlarge image',
  'common.noCategories': 'No categories yet.',
  'common.noTags': 'No tags yet.',

  // ── サイドバー ───────────────────────────────────────────────
  'sidebar.leftPanel': 'Side panel (left)',
  'sidebar.rightPanel': 'Side panel (right)',
  'sidebar.recent': 'Recent posts',
  'sidebar.archives': 'Archives',
  'sidebar.categories': 'Categories',
  'sidebar.categoriesAria': 'Category list',
  'sidebar.tags': 'Tags',
  'sidebar.tagsAria': 'Tag list',
  'sidebar.profile': 'Profile',
  'sidebar.calendar': 'Calendar',
  'sidebar.similarPosts': 'Related posts',

  // ── 記事一覧 (トップページ) ──────────────────────────────────
  'index.listAria': 'Post list',
  'index.empty': NO_POSTS,
  'index.paginationAria': 'Pagination',
  'index.prevPage': '← Previous',
  'index.nextPage': 'Next →',

  // ── 記事 ────────────────────────────────────────────────────
  'post.updated': 'Updated {date}',
  'post.charCount': { one: '{count} character', other: '{count} characters' },
  'post.readingTime': '{minutes} min read',
  'post.draftNotice': 'This post is a draft.',
  'post.contextNavAria': 'Previous and next posts',
  'post.headingLink': 'Link to this section',
  'post.badgePin': 'Pinned',
  'post.badgeDraft': 'Draft',

  // ── カテゴリー ──────────────────────────────────────────────
  'category.title': 'Categories',
  'category.empty': 'No categorized posts yet.',
  'category.listDescription': 'Posts in {name} ({count})',

  // ── タグ ────────────────────────────────────────────────────
  'tag.title': 'Tags',
  'tag.total': { one: '{count} tag', other: '{count} tags' },
  'tag.empty': 'No tagged posts yet.',
  'tag.detailTitle': 'Tag: {name}',
  'tag.listDescription': 'Posts tagged "{name}" ({count})',

  // ── アーカイブ ──────────────────────────────────────────────
  'archives.title': 'Archives',
  'archives.year': '{year}',
  'archives.month': '{year}/{month}',

  // ── カレンダー ──────────────────────────────────────────────
  /**
   * 曜日名のカンマ区切りリスト (SidebarRight が split(',') して使う。名中にカンマ不可)。
   * カレンダーの列は 1 列 26px ほどしかなく、3 文字 (Sun, Mon…) だと隣と詰まって
   * 繋がって見えるため 2 文字にする。1 文字 (S, M, T…) は T と S が重複して読み分けにくい。
   */
  'calendar.weekdays': 'Su,Mo,Tu,We,Th,Fr,Sa',
  'calendar.dayPosts': { one: '{count} post', other: '{count} posts' },

  // ── 検索 ────────────────────────────────────────────────────
  'search.label': 'Site search',
  'search.placeholder': SEARCH_PLACEHOLDER,
  'search.sidebarPlaceholder': SEARCH_PLACEHOLDER,
  'search.noIndex': 'Search index not found. Search is available on the built site.',
  'search.noResults': 'No matching posts.',

  // ── このサイトについて ──────────────────────────────────────
  'about.title': 'About',

  // ── 404 ─────────────────────────────────────────────────────
  'notFound.title': 'Page not found',
  'notFound.description': '404 Not Found',
  'notFound.message': 'The page you are looking for could not be found.',
  'notFound.backHome': 'Back to home',

  // ── コードブロック ──────────────────────────────────────────
  'code.expand': 'Expand',
  'code.collapse': 'Collapse',
  'code.fullscreen': 'Fullscreen',
  'code.copy': 'Copy',

  // ── 埋め込み ────────────────────────────────────────────────
  'embed.viewOnTwitter': 'View on Twitter',

  // ── 目次 ────────────────────────────────────────────────────
  'toc.title': 'Contents',

  // ── フローティングツールバー ────────────────────────────────
  'floating.backToTop': 'Back to top',
  'floating.scrollToBottom': 'Scroll to bottom',
  'floating.toggleToolbar': 'Toggle toolbar',
};
