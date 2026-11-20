# Changelog

このプロジェクトの主な変更点を記録する。
形式は [Keep a Changelog](https://keepachangelog.com/ja/1.1.0/) に、バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従う。

## [1.1.1] - 2026-11-20

### Fixed

- 空白を挟まず並ぶ脚注参照（`本文[^1]の続き[^2]`）が上付き文字に変換され、脚注にならない問題を修正
- 引用符なしのオフセット付き日時（`2026-10-01T09:30:00+09:00`）がサイトのタイムゾーンで二重に補正され、表示日やアーカイブの月がずれる問題を修正。あわせて月・日・時の 1 桁表記（`2026-10-9 9:30:00`）など、YAML 1.1 のタイムスタンプ表記を引き続き受け付けるようにした
- ファイル名に空白や記号を含む記事・`index.md`・frontmatter の `slug` を使う記事で、類似記事が表示されない、または存在しないページへリンクする問題を修正（`_` で始まるファイルを対象から外し、`.mdx` を対象に含める）
- `i18n.defaultLocale: en` でも、記事ページ以外では検索の案内文などが日本語で表示される問題を修正
- `:::`・`+++`・`;;;` ブロック内のコードブロックに閉じタグと同じ行があると、そこでブロックが閉じてしまう問題を修正
- タブを入れ子にしたとき、外側のタブの切り替えで表示されるパネルがずれる問題を修正
- 記事の抜粋が絵文字の途中で切れ、壊れた文字が出る問題を修正
- 1 つの記事に大文字小文字だけが違うタグ（`Astro` と `astro`）があると、タグの件数が重複して数えられる問題を修正

## [1.1.0] - 2026-11-20

### Added

- 英語 (en) の UI 文字列辞書を追加（`i18n.defaultLocale: en` で UI の文言・日付と数値の書式・`<html lang>` が英語になる）
- 件数の文言を数に応じて単数形と複数形で切り替える機能を追加
- 英語のサイトでは記事メタ情報の本文の量を文字数ではなく語数で表示
- 読了時間を文字種ごとに見積もる機能を追加（漢字・かなは文字数、それ以外は語数で数える）。速度は `reading.charsPerMinute` / `reading.wordsPerMinute` で変更でき、既定値は 400 字/分・230 語/分（`i18n.defaultLocale: zh` なら 300 字/分）

### Changed

- 日付と数値の整形で固定していた `ja-JP` を、`i18n.defaultLocale` に従うように変更
- **破壊的変更**: `i18n.defaultLocale` を地域を付けない言語コード（`ja`・`en` など）に限定。`ja-JP` や `en-US` のような地域付きのタグを指定するとビルドがエラーになるため、`ja` などに書き換える
- 曜日名が 3 文字以上の辞書を使うとき、カレンダーの曜日名が詰まって繋がって見えないよう列を詰めるように変更

### Removed

- `config/site.yaml` の `i18n.locales` を廃止（サイトの言語は `i18n.defaultLocale` だけで決まる。指定しても無視される）

### Fixed

- `src/content/blog` を symlink で外部のディレクトリにつないだとき、記事本文の編集が dev サーバーに反映されない問題を修正

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

[1.1.1]: https://github.com/pithos-day/blog-hishaku/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/pithos-day/blog-hishaku/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/pithos-day/blog-hishaku/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/pithos-day/blog-hishaku/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/pithos-day/blog-hishaku/releases/tag/v1.0.0
