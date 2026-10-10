---
title: Shoka 構文サンプル
date: 2026-09-10 12:00:00
description: "Markdown 拡張構文 (::: ブロック、タブ、ルビ、スポイラー等) の動作サンプルです。"
tags:
  - サンプル
  - Markdown
categories:
  - ツール
keywords:
  - Markdown
  - Shoka
---

この記事は Markdown 拡張構文を一通り試すサンプルです。

## 提醒ブロック (`:::`)

:::default
default ブロックです。デフォルトのスタイルで表示されます。
:::

:::info
info ブロックです。型名は `default` / `primary` / `info` / `success` / `warning` / `danger` があります。
:::

:::success
success ブロックです。完了や成功のメッセージに使います。
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

### インライン効果

- 下線: ++下線テキスト++ (属性で `++波線++{.wavy}` も可)
- ハイライト: ==強調テキスト==
- 上下付き: H~2~O、E = mc^2^
- スポイザー: !!この文章はクリックすると表示されます!! と !!ぼかし表示!!{.blur}
- ルビ: {漢字^かんじ} / 全体注音 {漢字^=かんじ} / 着重点 {漢字^*}

### 色クラス・キーボード・ラベル

色付きテキスト: [赤]{.red} [ピンク]{.pink} [オレンジ]{.orange} [黄]{.yellow} [緑]{.green} [アクア]{.aqua} [青]{.blue} [紫]{.purple} [灰]{.grey}

[このテキストは虹色にグラデーションします]{.rainbow}

キーボード: [Ctrl]{.kbd} + [C]{.kbd} でコピー、[Ctrl]{.kbd} + [V]{.kbd} で貼り付け

ラベル: [デフォルト]{.label .default} [プライマリ]{.label .primary} [情報]{.label .info} [成功]{.label .success} [警告]{.label .warning} [危険]{.label .danger}

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

## 数式 (KaTeX)

インライン数式: $E = mc^2$、$\alpha + \beta = \gamma$

ブロック数式:

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

## コードブロック

メタ文字列でタイトル・行ハイライト・コマンドプロンプトを付けています:

```js title="hello.js" url="https://example.com/source" linkText="Source" mark:1,3
console.log('1 行目');
const answer = 42;
console.log('3 行目');
```

```bash command:("$":1-2)
pnpm install
pnpm dev
```

8 行を超えるコードブロックは初期状態で折りたたまれます:

```text
1 行目
2 行目
3 行目
4 行目
5 行目
6 行目
7 行目
8 行目
9 行目
10 行目
```

## 通常の Markdown

見出しには `#` アンカーが付きます。外部リンクは自動で新規タブになります
([example.com](https://example.com))。

> 引用も通常どおり動きます。

| 列 A | 列 B |
| ---- | ---- |
| 1    | 2    |

## 埋め込み (リンクカード・ツイート・画像)

独行リンクはビルド時に OGP を取得して、プレビューカードになります。

https://astro.build/

Twitter のステータス URL は、ビルド時にツイートデータを取得して
静的カードとして表示されます (取得できない場合はリンクのまま)。

https://twitter.com/jack/status/20

本文中の[行内リンク](https://example.com/)は従来どおり通常のリンクとして残ります。

画像は中央揃えされ、alt 属性がキャプションとして表示されます。

![スティッカー画像のサンプル](/img/covers/sticky.svg)
