---
title: 下書き記事のテスト
date: 2026-10-06 10:00:00
draft: true
description: "draft: true を指定した下書き記事のテスト用です。本番ビルドでは除外されます。"
tags:
  - テスト
categories:
  - ノート
keywords:
  - draft
  - 下書き
---

この記事は、frontmatter の `draft: true` を指定した下書き記事のテスト用です。

## 挙動

- `pnpm dev` — 一覧・詳細ページに表示され、下書きバッジが付きます
- `pnpm build` — 一覧・詳細ページ・タグ・カテゴリ・RSS から除外されます

つまり、開発中の記事を書きながら公開物と混在させることができます。

## frontmatter

```yaml
---
title: 下書き記事のテスト
date: 2026-10-06 10:00:00
draft: true
---
```

`draft` は省略時 `false` です。`draft: false` と明示しても本番では公開されます。

## 確認手順

1. `pnpm dev` でこの記事が一覧とタグページに表示されることを確認する
2. `pnpm build && pnpm preview` でこの記事が表示されないことを確認する
3. 開発時の記事ヘッダに下書きバッジが付くことを確認する
