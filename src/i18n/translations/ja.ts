/**
 * 日本語 (ja) — UI 文字列 (既定ロケール辞書)
 *
 * テンプレートの UI に表示される日本語はすべてここに集約する。
 * 他のロケールを足す場合は、この辞書を部分的に上書きするファイルを
 * translations/ に追加して translations/index.ts に登録する
 * (ここに存在しないキーは既定の ja にフォールバックする)。
 */

export const uiStrings = {
  // ── 共通 ─────────────────────────────────────────────────────
  'common.search': '検索',
  'common.close': '閉じる',
  'common.themeToggle': 'テーマを切り替え',
  'common.breadcrumb': 'パンくず',
  'breadcrumb.home': 'ホーム',
  'common.yearMonth': '{year}年{month}月',
  'common.postCount': '{count} 件',
  'common.noPosts': 'まだ記事がありません。',
  'common.noCategories': 'まだカテゴリがありません。',
  'common.noTags': 'まだタグがありません。',

  // ── サイドバー ───────────────────────────────────────────────
  'sidebar.leftPanel': 'サイドパネル (左)',
  'sidebar.rightPanel': 'サイドパネル (右)',
  'sidebar.recent': '最近の記事',
  'sidebar.archives': 'アーカイブ',
  'sidebar.categories': 'カテゴリ',
  'sidebar.categoriesAria': 'カテゴリ一覧',
  'sidebar.tags': 'タグ',
  'sidebar.tagsAria': 'タグ一覧',
  'sidebar.profile': 'プロフィール',
  'sidebar.calendar': 'カレンダー',

  // ── 記事一覧 (トップページ) ──────────────────────────────────
  'index.listAria': '記事一覧',
  'index.empty': 'まだ記事がありません。',
  'index.paginationAria': 'ページネーション',
  'index.prevPage': '← 前のページ',
  'index.nextPage': '次のページ →',

  // ── 記事 ────────────────────────────────────────────────────
  'post.updated': '更新 {date}',
  'post.charCount': '{count}文字',
  'post.readingTime': '約{minutes}分',
  'post.draftNotice': 'この記事は下書きです。',
  'post.contextNavAria': '前後の記事',
  'post.headingLink': 'このセクションへのリンク',
  'post.badgePin': 'ピン留め',
  'post.badgeDraft': '下書き',

  // ── カテゴリー ──────────────────────────────────────────────
  'category.title': 'カテゴリ',
  'category.empty': 'カテゴリ付きの記事がまだありません。',
  'category.listDescription': '{name} の記事一覧 ({count} 件)',

  // ── タグ ────────────────────────────────────────────────────
  'tag.title': 'タグ',
  'tag.total': '{count} 個',
  'tag.empty': 'タグ付きの記事がまだありません。',
  'tag.detailTitle': 'タグ: {name}',
  'tag.listDescription': 'タグ「{name}」の記事一覧 ({count} 件)',

  // ── アーカイブ ──────────────────────────────────────────────
  'archives.title': 'アーカイブ',
  'archives.year': '{year} 年',
  'archives.month': '{year} 年 {month} 月',

  // ── カレンダー ──────────────────────────────────────────────
  'calendar.weekdays': '日,月,火,水,木,金,土',
  'calendar.dayPosts': '{count} 件の記事',

  // ── 検索 ────────────────────────────────────────────────────
  'search.label': 'サイト内検索',
  'search.placeholder': '記事を検索…',
  'search.sidebarPlaceholder': '記事を検索…',
  'search.noIndex': '検索インデックスが見つかりません。ビルド後のサイトで利用できます。',
  'search.noResults': '一致する記事がありません。',

  // ── このサイトについて ──────────────────────────────────────
  'about.title': 'このサイトについて',

  // ── 404 ─────────────────────────────────────────────────────
  'notFound.title': 'ページが見つかりません',
  'notFound.description': '404 Not Found',
  'notFound.message': 'お探しのページは見つかりませんでした。',
  'notFound.backHome': 'ホームへ戻る',

  // ── コードブロック ──────────────────────────────────────────
  'code.expand': '展開',
  'code.collapse': '折りたたみ',
  'code.fullscreen': '全画面',
  'code.copy': 'コピー',

  // ── 目次 ────────────────────────────────────────────────────
  'toc.title': '目次',

  // ── フローティングツールバー ────────────────────────────────
  'floating.backToTop': 'ページ上部へ移動',
  'floating.scrollToBottom': 'ページ下部へ移動',
  'floating.toggleToolbar': 'ツールバーを切り替え',
};
