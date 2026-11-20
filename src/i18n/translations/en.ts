/**
 * English (en) — UI 文字列
 *
 * ja.ts と同じキーをすべて持つ。DefaultUIStrings で型付けしているため、
 * ja.ts にキーを足したらここにも訳を足さないと型エラーになる。
 * 数で語形が変わる文言は { one, other } で書き、t() が count から選ぶ。
 *
 * 大文字の使い方:
 * - 画面に出る見出し・ナビ・ページタイトルは title case (Recent Posts, Back to Home)。
 *   WordPress などのクラシックなブログのサイドバー見出しに合わせる。
 * - 文・メッセージ・aria-label・ボタンの説明は sentence case (No posts yet., Toggle theme)。
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
  'sidebar.recent': 'Recent Posts',
  'sidebar.archives': 'Archives',
  'sidebar.categories': 'Categories',
  'sidebar.categoriesAria': 'Category list',
  'sidebar.tags': 'Tags',
  'sidebar.tagsAria': 'Tag list',
  'sidebar.profile': 'Profile',
  'sidebar.calendar': 'Calendar',
  'sidebar.similarPosts': 'Related Posts',

  // ── 記事一覧 (トップページ) ──────────────────────────────────
  'index.listAria': 'Post list',
  'index.empty': NO_POSTS,
  'index.paginationAria': 'Pagination',
  'index.prevPage': '← Previous',
  'index.nextPage': 'Next →',

  // ── 記事 ────────────────────────────────────────────────────
  'post.updated': 'Updated {date}',
  'post.charCount': { one: '{count} character', other: '{count} characters' },
  'post.wordCount': { one: '{count} word', other: '{count} words' },
  'post.readingTime': '{minutes} min read',
  'post.draftNotice': 'This post is a draft.',
  'post.contextNavAria': 'Previous and next posts',
  'post.headingLink': 'Link to this section',
  'post.badgePin': 'Pinned',
  'post.badgeDraft': 'Draft',
  'post.shareAria': 'Share this post',
  'post.shareTweet': 'Tweet',
  'post.shareCopyUrl': 'Copy URL',
  'post.shareCopied': 'Copied!',

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
   * ブログのカレンダーウィジェットで一般的な 1 文字にする (T と S の重複は位置で読み分ける)。
   */
  'calendar.weekdays': 'S,M,T,W,T,F,S',
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
  'notFound.title': 'Page Not Found',
  'notFound.description': '404 Not Found',
  'notFound.message': 'The page you are looking for could not be found.',
  'notFound.backHome': 'Back to Home',

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
