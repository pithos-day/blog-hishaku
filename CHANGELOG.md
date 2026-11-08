# Changelog

このプロジェクトの主な変更点を記録する。
形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に、バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従う。

## [1.0.2] - 2026-11-09

### Added

- 独行の YouTube リンクを埋め込みプレイヤーに変換する機能を追加（`content.enableYouTubeEmbed` で切り替え）

### Fixed

- ラベル付きリンク（`[docs](https://example.com/docs)` など）が独行リンクとして埋め込みカードになる問題を修正
- 記事ページの前後ナビがピン留め記事の並びに引きずられ、日付順にたどれない問題を修正
- 続けて検索すると古い結果が混ざり、結果が重複する問題を修正

## [1.0.1] - 2026-11-06

### Added

- 本文中で連続する縦長・正方形の画像を自動で横並びにする機能を追加

### Changed

- 本文中の縦長画像の高さを制限
- モバイル表示でサイドバーを本文の下に表示
- `package.json` に author と repository のメタデータを追加

### Fixed

- モバイル表示で本文が横にはみ出す問題を修正
- プレーンテキスト抽出で見出しが含まれる問題を修正
- インライン絵文字構文のプレーンテキスト化で `:emoji` 接頭辞が残る問題を修正

## [1.0.0] - 2026-10-14

初回リリース。

### Added

#### レイアウト・デザイン

- Tailwind CSS 4 によるデザイン基盤
- 左右サイドバー付きの3カラムレイアウト（プロフィール・タグ・最近の記事・目次・関連記事の各パネル）
- ダークテーマと、テーマ切り替えボタンを含む右下のフローティングツールバー
- サイト全体のフォントに Gen Interface JP、コードブロックに JetBrains Mono を採用
- 記事メタ情報（日時・文字数・読了時間）のアイコン付き表示

#### 記事・ページ

- `blog` コレクションと `config/site.yaml` による設定の一元管理
- 記事一覧・記事ページ・カテゴリ・タグ・アーカイブ・404 ページ
- 記事一覧のページネーション（2ページ目以降は `/posts/N`）と前後記事ナビ
- 階層番号付きの目次
- `/about` を `about.md` から生成
- 埋め込みモデル（multilingual-e5-small）による関連記事の表示
- Pagefind によるサイト内検索
- UI 文字列の i18n モジュール化

#### Markdown 拡張

- Shoka 系の Markdown 拡張構文（色・`kbd`・`label`・rainbow・ぼかし spoiler・note ブロックなど）
- KaTeX による数式表示
- コードブロックの強化（行ハイライト・折りたたみ・コピーボタン）
- インライン絵文字構文 `:emoji[url]`
- 単独行のリンクを OG プレビューカードに変換
- ツイートのビルド時埋め込み（複数画像のグリッド表示、動画・GIF の再生に対応）
- 画像の figure + alt キャプション化とライトボックス表示
- LQIP（低画質プレースホルダー画像）の生成

#### SEO・配信

- RSS・sitemap・robots.txt
- OGP / Twitter カード、robots meta、meta keywords の自動生成
- JSON-LD（BlogPosting / BreadcrumbList）
- Umami によるアクセス解析の設定
- Cloudflare へのデプロイ対応

[1.0.2]: https://github.com/pithos-day/blog-hishaku/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/pithos-day/blog-hishaku/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/pithos-day/blog-hishaku/releases/tag/v1.0.0
