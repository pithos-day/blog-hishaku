---
title: ピン留め記事のサンプル
date: 2026-10-05 12:00:00
sticky: true
cover: /img/covers/sticky.svg
description: "sticky: true を指定すると、記事一覧の先頭に固定されます。"
tags:
  - サンプル
categories:
  - [フロントエンド, Astro]
---

`sticky: true` を指定した記事は、日付に関係なく一覧の先頭に並びます。

## 階層カテゴリ

この記事の frontmatter は次の通りです。

```yaml
categories:
  - [フロントエンド, Astro]
```

`フロントエンド > Astro` の階層カテゴリが作られます(`categoryMap` で URL スラッグに変換)。
