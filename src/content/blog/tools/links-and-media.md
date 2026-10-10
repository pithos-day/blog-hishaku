---
title: フレンドリンク・メディア・リンク埋め込み
date: 2026-10-04 13:00:00
description: Hexoタグ風構文のフレンドリンク、動画・音声ブロック、独行URLのOGPカード埋め込みを紹介する記事です。
tags:
  - サンプル
  - 構文
categories:
  - ツール
keywords:
  - links
  - media
  - OGP
  - フレンドリンク
---

blog-hishaku には、Hexo のタグプラグインに似た構文が用意されています。また、段落に URL だけを書くと OGP プレビューカードに変換されます。

## フレンドリンク `{% links %}`

`{% links %}` と `{% endlinks %}` の間に YAML 形式でサイト情報を書くと、カードグリッドとして表示されます。

{% links %}
- site: Astro
  url: https://astro.build/
  owner: Astro Team
  desc: モダンなWebフレームワーク
  color: '#ff5d01'
- site: MDN Web Docs
  url: https://developer.mozilla.org/
  owner: Mozilla
  desc: Web技術の包括的なリファレンス
- site: example
  url: https://example.com/
  desc: 画像とカラーを省略した簡易カード
{% endlinks %}

### フィールド

| フィールド | 必須 | 説明 |
| --- | --- | --- |
| `site` | あり | カードの表示名 |
| `url` | あり | リンク先URL |
| `owner` | - | 管理者名 |
| `desc` | - | サイトの説明 |
| `image` | - | アバター画像のパス |
| `color` | - | カードのアクセント色 (hex / named / rgb / hsl) |

## メディアブロック `{% media %}`

### 動画

{% media video %}
- name: サンプル動画
  url: https://example.com/sample.mp4
{% endmedia %}

### 音声

音声は再生プレイヤーではなく、楽曲へのリンクカードとして表示されます。

{% media audio %}
- name: サンプルソング
  url: https://example.com/song
- title: PLAYLIST
  list:
    - https://example.com/track/1
    - https://example.com/track/2
{% endmedia %}

## リンク埋め込み

段落に URL そのものだけを書くと、ビルド時に OGP 情報を取得してプレビューカードに変換されます。

https://developer.mozilla.org/

取得に失敗した場合は素のリンクとして残るため、リンク切れでもビルドは止まりません。取得結果は `.cache/og-data.json` にキャッシュされます。

X(Twitter)のステータスURLを書く場合は、静的ツイートカードに変換されます。

## テストチェックリスト

1. フレンドリンクがカードグリッドで3件表示される
2. 動画ブロックに `<video>` プレイヤーが表示される
3. 音声ブロックに楽曲リンクが表示される
4. 独行URLがOGPカードに変換される
