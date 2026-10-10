---
title: ピン留め記事のテスト
date: 2026-10-05 12:00:00
sticky: true
cover: /img/covers/sticky.svg
description: "sticky: true を指定すると、記事一覧の先頭に固定されます。ピン留め機能のテスト用記事です。"
tags:
  - サンプル
  - テスト
categories:
  - [フロントエンド, Astro]
keywords:
  - sticky
  - ピン留め
---

この記事は、frontmatter の `sticky: true` を指定したピン留め記事のテスト用です。

## 挙動

`sticky: true` の記事は、日付降順の並びに関係なく一覧の先頭に固定され、ピンバッジが表示されます。複数のピン留め記事がある場合は、日付降順で先頭に集まります。

## frontmatter

この記事の frontmatter は次の通りです。

```yaml
---
title: ピン留め記事のテスト
date: 2026-10-05 12:00:00
sticky: true
cover: /img/covers/sticky.svg
categories:
  - [フロントエンド, Astro]
---
```

## 階層カテゴリ

`categories` に `[フロントエンド, Astro]` と配列の配列を指定することで、`フロントエンド > Astro` の階層カテゴリを作れます。

## cover画像

`cover` を指定すると、一覧のサムネイルと OGP 画像に使われます。この記事には `/img/covers/sticky.svg` を指定しています。

## 確認手順

1. 一覧ページを開く
2. この記事が先頭に並び、ピンバッジが付いていることを確認する
3. 一覧の他の記事と日付の並びが変わらないことを確認する
