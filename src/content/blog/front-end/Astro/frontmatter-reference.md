---
title: frontmatterリファレンス
date: 2026-09-28 10:00:00
updated: 2026-10-07 09:00:00
subtitle: 記事のfrontmatterで指定できる全フィールド
description: blog-hishakuの記事frontmatterで指定できるフィールドをすべて解説します。型・既定値・使用例つき。
tags:
  - Astro
  - テンプレート
categories:
  - [フロントエンド, Astro]
keywords:
  - frontmatter
  - リファレンス
  - schema
---

この記事は、`src/content/blog/` 以下の記事ファイルで使える frontmatter フィールドのリファレンスです。

## フィールド一覧

| フィールド | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `title` | string | あり | 記事タイトル |
| `date` | string / Date | あり | 投稿日時 |
| `updated` | string / Date | - | 更新日時 |
| `description` | string | - | 一覧・OGP用の説明 |
| `subtitle` | string | - | 副題 |
| `link` | string | - | カスタムURLスラッグ |
| `cover` | string | - | サムネイル画像パス |
| `tags` | string[] | - | タグ一覧 |
| `categories` | string[] / string[][] | - | カテゴリ |
| `keywords` | string[] | - | SEOキーワード |
| `sticky` | boolean | - | 一覧先頭に固定 |
| `draft` | boolean | - | 下書きとして扱う |
| `catalog` | boolean | - | カタログに含める (既定 true) |
| `math` | boolean | - | 数式CSSを読み込む (既定 true) |
| `excludeFromSummary` | boolean | - | 類似記事生成の対象外 |

## title (必須)

```yaml
title: 記事タイトル
```

記事ヘッダ、一覧、RSS、OGP、JSON-LD のすべてで使われます。

## date (必須)

```yaml
date: 2026-10-01 09:30:00
```

対応形式:

- `YYYY-MM-DD`
- `YYYY-MM-DD HH:mm:ss`
- `YYYY-MM-DDTHH:mm:ss`
- オフセット付きISO (`2026-10-01T09:30:00+09:00`)

`config/site.yaml` の `site.timezone` (既定 `Asia/Tokyo`) 基準で解釈されます。アーカイブの月別集計にも使われます。

## updated

```yaml
updated: 2026-10-07 09:00:00
```

記事ヘッダに更新日として表示され、JSON-LD の `dateModified` にも反映されます。

## description

```yaml
description: 一覧やOGPに表示される説明文。
```

省略した場合は本文のプレーンテキスト冒頭150字が自動で使われます。記事一覧の抜粋、`<meta name="description">`、JSON-LD に使用されます。

## subtitle

```yaml
subtitle: 副題テキスト
```

記事タイトルの下と一覧ページに表示されます。Hexo からの移行互換フィールドです。

## link

```yaml
link: custom-permalink
```

省略時はファイル名(拡張子なし・小文字化)が URL になります。指定すると `/post/{link}/` になります。

## cover

```yaml
cover: /img/covers/sticky.svg
```

`public/` からの相対パスを指定します。一覧のサムネイル、OGP画像、JSON-LDの画像に使われます。省略時は `defaultOgImage` → `avatar` の順にフォールバックします。

## tags

```yaml
tags:
  - Astro
  - テンプレート
```

大文字小文字を区別しません。タグページのURL、RSS の `<category>`、meta keywords に使われます。

## categories

単一の階層チェーン:

```yaml
categories:
  - フロントエンド
  - Astro
```

複数のチェーン:

```yaml
categories:
  - [フロントエンド, Astro]
  - [ライフ]
```

カテゴリページのURLは `config/site.yaml` の `categoryMap` でスラッグ化されます。未登録の名前はそのままエンコードされます。

## keywords

```yaml
keywords:
  - permalink
  - frontmatter
```

タグ・カテゴリ名と重複除去した上で、`<meta name="description">` とは別に meta keywords と JSON-LD に反映されます。

## sticky

```yaml
sticky: true
```

一覧の先頭に固定され、ピンバッジが表示されます。

## draft

```yaml
draft: true
```

本番ビルドでは一覧・詳細・タグ・カテゴリ・RSS から除外されます。開発時は表示され、下書きバッジが付きます。

## catalog

```yaml
catalog: false
```

`false` を指定するとカテゴリツリー・件数・カテゴリページから除外されます。サイトマップ的な記事としては残ります。

## math

```yaml
math: false
```

`false` を指定すると、その記事のページに KaTeX の CSS を読み込みません。数式を含まない記事でページ負荷を下げる用途です。

## excludeFromSummary

```yaml
excludeFromSummary: true
```

`pnpm generate:similarities` による類似記事生成の対象から除外されます。類似度計算に使う埋め込み入力(タイトル + description/本文冒頭)に含めたくない記事向けです。

## 未対応フィールド

`password` は未対応です。指定するとビルド時にスキーマ検証エラーになります。

```yaml
password: secret  # ビルドエラーになる
```

## 完全な使用例

```yaml
---
title: 完全なfrontmatterの例
date: 2026-10-07 09:00:00
updated: 2026-10-08 12:00:00
description: 一覧とOGPに表示される説明文。
subtitle: 副題も表示できます
link: full-example
cover: /img/covers/sticky.svg
tags:
  - Astro
  - リファレンス
categories:
  - [フロントエンド, Astro]
keywords:
  - frontmatter
  - reference
sticky: false
draft: false
catalog: true
math: true
excludeFromSummary: false
---
```
