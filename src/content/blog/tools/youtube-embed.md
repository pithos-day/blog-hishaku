---
title: YouTube埋め込みのテスト
date: 2026-11-09 09:00:00
subtitle: 通常の動画・開始位置の指定・ショート動画の表示を確認する
description: 独行の YouTube URL が埋め込みプレイヤーに変換されることを確認するためのテスト記事です。
tags:
  - サンプル
  - 埋め込み
categories:
  - ツール
keywords:
  - YouTube
  - 動画
  - 埋め込み
---

段落に YouTube の動画 URL だけを書くと、埋め込みプレイヤーに変換されます。プレイヤーは `youtube-nocookie.com` から読み込むため、再生するまで YouTube の Cookie は保存されません。

## 通常の動画

https://www.youtube.com/watch?v=jNQXAC9IVRw

## 短縮 URL と開始位置の指定

`youtu.be` の短縮 URL にも対応しています。`?t=10` や `?t=1m30s` を付けると、その位置から再生されます。

https://youtu.be/jNQXAC9IVRw?t=10

## ショート動画

`/shorts/` の URL は縦長のプレイヤーになります。

https://www.youtube.com/shorts/jNQXAC9IVRw

## 文中のリンク

[文中の YouTube リンク](https://www.youtube.com/watch?v=jNQXAC9IVRw) は埋め込みにならず、普通のリンクのままです。

## 無効にする場合

`config/site.yaml` の `content.enableYouTubeEmbed` を `false` にすると、YouTube の URL も一般リンクと同じ OG プレビューカードになります。
