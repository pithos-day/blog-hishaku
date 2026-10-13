# blog-hishaku

![blog-hishaku のトップページ (左がライトテーマ、右がダークテーマ)](./docs/assets/blog-hishaku.webp)

クラシックなデザインの Astro ブログテンプレート。

３カラムのクラシックなレイアウトに、日本語ブログに必要な機能をまとめた静的ブログテンプレートです。設定は `config/site.yaml` に集約されており、記事は Markdown で書くだけです。

## 記事を書く

`src/content/blog/` 内の任意の場所にMarkdownファイルを置きます。

```markdown
---
title: 記事タイトル
date: 2026-10-13
description: meta description と一覧の抜粋に使われます
tags: [日記]
categories: [ノート]
---

本文を書きます。
```

| frontmatter | 動き |
| --- | --- |
| `link` | URL のスラッグを指定 (未指定ならファイル名) |
| `updated` | 記事ヘッダに更新日を表示、JSON-LD にも反映 |
| `subtitle` | タイトル下に表示される副題 |
| `sticky` | 記事一覧の先頭にピン留め |
| `draft` | 本番ビルドでは非公開 |
| `keywords` | SEO 用のメタ情報 |

サンプル記事は `src/content/blog/` にまとまっています。構文の確認には [Markdown構文と拡張構文のすべて](https://hishaku.pithos.day/post/tools/custom-syntax/) が便利です。

## ローカルで動作確認

要件: **Node.js ≥ 22.12.0** / **pnpm 12.10.1** ([package.json](./package.json) 準拠)

```bash
git clone https://github.com/pithos-day/blog-hishaku.git
cd blog-hishaku
pnpm install
pnpm dev
```

`http://localhost:4321` でプレビューできます。

[config/site.yaml](./config/site.yaml) でサイト名・著者・URL・SNS リンク・解析・Markdown 拡張のオンオフなどを変更します。変更後は dev server の再起動 (または再ビルド) が必要です。

### ビルド

```bash
pnpm build     # dist/ に静的出力 + Pagefind のインデックス生成
pnpm preview   # dist/ のプレビュー
```

`dist/` を任意の静的ホスティングに置くだけで公開できます。

## パフォーマンス

PageSpeed Insights での[計測結果](https://pagespeed.web.dev/analysis/https-hishaku-pithos-day/v1exwuyp0y?hl=ja-jp&form_factor=desktop)です。

デスクトップでの閲覧を想定してオールグリーンになるようにしています。

![PageSpeed Insightsのレポート (2026年10月)](./docs/assets/pagespeed_insights.webp)

> **注:** スコアは計測環境・接続・コンテンツによって変わります。自分のサイトで計測し直してください。

## 謝辞

このプロジェクトのデザインと実装の参考にさせていただいた、以下のプロジェクトに感謝します。

- [astro-koharu](https://github.com/cosZone/astro-koharu)
- [Hexo テーマ Shoka](https://shoka.lostyu.me/computer-science/note/theme-shoka-doc/)

## License

[MIT](./LICENSE)
