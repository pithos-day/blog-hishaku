---
title: blog-hishakuへようこそ
date: 2026-10-01 09:30:00
description: 最小構成のAstroブログテンプレート「blog-hishaku」の紹介記事。特徴・サイト構成・使い方をまとめました。
subtitle: テンプレートの紹介
tags:
  - Astro
  - テンプレート
categories:
  - ノート
keywords:
  - Astro
  - ブログテンプレート
  - blog-hishaku
---

**blog-hishaku** は、Astroで構築された最小構成のブログテンプレートです。日本語ブログを書くために必要な機能を備えつつ、設定は `config/site.yaml` に集約されているため、メンテナンスがしやすい設計になっています。

この記事では、blog-hishaku が何ができるテンプレートなのかを紹介します。

## 主な特徴

- **設定の一元管理** — サイト情報・コンテンツ設定はすべて `config/site.yaml`
- **拡張Markdown** — ショーケース風のブロック構文、インライン装飾、ルビ、スポイラーなど
- **記事管理機能** — カテゴリ・タグ・アーカイブ・下書き・ピン留め・カスタムリンク
- **静的サイト生成** — ビルドは静的HTML。pagefindによる全文検索付き
- **RSS・sitemap・SEO対応** — OGP、JSON-LD、canonicalを標準装備

## サイト構成

```
blog-hishaku/
├── config/
│   └── site.yaml          # サイト設定
├── src/
│   ├── content/
│   │   └── blog/          # 記事 (Markdown)
│   ├── layouts/           # レイアウト
│   ├── pages/             # ページ
│   └── styles/            # スタイル
└── public/                # 静的アセット
```

## 記事の書き方

記事は `src/content/blog/` 以下に `.md` ファイルを置くだけで作成できます。frontmatterで日付やタグを指定します。

```yaml
---
title: 記事タイトル
date: 2026-10-01 09:30:00
description: 一覧やOGPに表示される説明文
tags:
  - タグ1
  - タグ2
categories:
  - カテゴリ
---
```

frontmatterで指定できるフィールドの一覧は「frontmatterリファレンス」の記事を参照してください。

## 開発コマンド

| コマンド | 説明 |
| --- | --- |
| `pnpm dev` | 開発サーバーを起動 |
| `pnpm build` | 本番ビルド + 検索インデックス生成 |
| `pnpm preview` | ビルド結果をプレビュー |
| `pnpm lint` | コードチェック |
| `pnpm check` | 型チェック |

## まとめ

blog-hishakuは、拡張Markdownで手軽に書ける日本語ブログテンプレートです。この記事のほかに、構文の総合テスト記事やfrontmatterリファレンスも用意しているので、そちらもぜひ読んでみてください。
