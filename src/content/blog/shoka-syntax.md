---
title: Shoka 構文サンプル
date: 2026-09-10 12:00:00
description: "astro-koharu 互換の Markdown 拡張構文 (::: ブロック、タブ、ルビ、スポイラー等) の動作サンプルです。"
tags:
  - サンプル
  - Markdown
categories:
  - ツール
keywords:
  - Markdown
  - Shoka
---

この記事は astro-koharu 互換の Markdown 拡張構文を一通り試すサンプルです。

## 提醒ブロック (`:::`)

:::info
info ブロックです。型名は `default` / `primary` / `info` / `success` / `warning` / `danger` があります。
:::

:::warning no-icon
`no-icon` オプション付きの warning ブロックです。
:::

:::primary
ブロックは入れ子にできます。

:::danger
内側の danger ブロック
:::

:::

## タブ (`;;;`)

;;;pkg パッケージ管理
パッケージの追加は pnpm で行います。

```bash
pnpm add astro
```
;;;

;;;pkg npm
npm も利用できます。

```bash
npm install astro
```
;;;

## 折りたたみ (`+++`)

+++primary 詳細を表示
中身は段落でも箇条書きでもかまいません。

- 箇条書き 1
- 箇条書き 2
+++

## テキスト効果

- 下線: ++下線テキスト++ (属性で `++波線++{.wavy}` も可)
- ハイライト: ==強調テキスト==
- 上下付き: H~2~O、E = mc^2^
- スポイザー: !!この文章はクリックすると表示されます!! と !!ぼかし表示!!{.blur}
- ルビ: {漢字^かんじ} / 全体注音 {漢字^=かんじ} / 着重点 {漢字^*}

エスケープもできます: \++これは効果になりません++ \==この強調も無効です==

## 属性構文 (`{...}`)

インライン属性: [テキスト]{.wavy} は span に、[外部サイト](https://example.com){.external} はリンク要素にクラスが付きます。

次の段落に `{.note-info}` ブロック属性を置くと、直前の段落へ適用されます。

この段落に info 風のクラスが付きます。

{.note-info}

リスト項目にも付きます:

- 通常の項目
- クラス付きの項目 {.primary}

## Hexo タグ (`{% links %}`)

{% links %}
- site: Example Blog
  url: https://example.com
  owner: Alice
  desc: サンプル用のフレンドリンク
  color: '#4f46e5'
- site: Another Site
  url: https://example.org
  owner: Bob
  desc: もう一つのサンプル
{% endlinks %}

## 通常の Markdown

見出しには `#` アンカーが付きます。外部リンクは自動で新規タブになります
([example.com](https://example.com))。

> 引用も通常どおり動きます。

| 列 A | 列 B |
| ---- | ---- |
| 1    | 2    |
