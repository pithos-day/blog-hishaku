---
title: カスタムリンクのテスト
link: hello-hishaku
date: 2026-08-15 20:00:00
updated: 2026-10-04 08:00:00
subtitle: link フィールドでURLを自由に決められます
description: frontmatter の link を指定すると、ファイル名に関係なくURLを決められます。カスタムリンクのテスト用記事です。
tags:
  - サンプル
  - URL
categories:
  - ツール
keywords:
  - permalink
  - frontmatter
  - link
---

この記事は、frontmatter の `link` を指定したカスタムリンクのテスト用です。

## URL

この記事の URL は `/post/hello-hishaku/` です。ファイル名は `custom-link.md` であり、URLには反映されません。

## 挙動

- `link` を指定しない場合 — ファイル名(拡張子なし・小文字化)が URL になる
- `link` を指定する場合 — 指定した値が URL になる(`/post/{link}/`)

ファイルを移動しても URL を維持したい場合や、URL を日本語以外の短い語彙に揃えたい場合に使います。

## frontmatter

```yaml
---
title: カスタムリンクのテスト
link: hello-hishaku
date: 2026-08-15 20:00:00
updated: 2026-10-04 08:00:00
subtitle: link フィールドでURLを自由に決められます
---
```

## updated の表示

`updated` を指定すると、記事ヘッダに更新日が表示され、JSON-LD の `dateModified` にも使われます。この記事は 2026-10-04 に更新されたことになっています。

## subtitle の表示

`subtitle` は記事タイトルの下、本文の冒頭に表示されます。一覧ページの抜粋部分にも使われます。

## 確認手順

1. `/post/hello-hishaku/` にアクセスできることを確認する
2. 記事ヘッダに更新日が表示されることを確認する
3. タイトルの下に副題が表示されることを確認する
