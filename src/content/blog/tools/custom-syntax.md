---
title: Markdown構文と拡張構文のすべて
date: 2026-10-02 14:00:00
description: blog-hishakuで使える標準Markdown・GFM構文と、拡張されたShoka系構文をすべて紹介・テストする記事です。
subtitle: 全構文のショーケースとテスト台帳
tags:
  - サンプル
  - Markdown
categories:
  - ツール
keywords:
  - Markdown
  - 構文
  - テスト
---

この記事は、blog-hishaku で使える Markdown 構文と拡張構文をすべて紹介するためのテスト台帳です。各セクションで記法とレンダリング結果を並べています。

## 標準Markdown

### 見出し

`#` の数で見出しレベルが決まります。h2 と h3 は左サイドバーの目次に抽出されます。

### 段落と改行

段落は空行で区切ります。行末に2つのスペースを置くと改行になります。

### 強調

**太字**、*斜体*、***太字+斜体***、~~取り消し線~~。

### リスト

番号なしリスト:

- 項目1
- 項目2
  - ネストした項目
- 項目3

番号付きリスト:

1. 番号付き1
2. 番号付き2
3. 番号付き3

### リンクと画像

[Astroの公式サイト](https://astro.build/)へリンクできます。

![スティッカー画像](/img/covers/sticky.svg)

### 引用

> 引用ブロックです。複数行にまたがることもあります。
> 2行目の引用です。

### コード

インラインコードは `code` のように書きます。

### テーブル

| 構文 | 種別 | 備考 |
| --- | --- | --- |
| `**太字**` | 強調 | 標準 |
| `++下線++` | 拡張 | ins要素 |
| `==ハイライト==` | 拡張 | mark要素 |

### タスクリスト

- [x] 完了したタスク
- [ ] 未完了のタスク
- [ ] これも未完了

### 脚注

脚注の参照[^note]はページ末尾に定義を書きます。

[^note]: これが脚注の本文です。

### 独行URL

段落内にURLだけを書くと、自動的にOGPプレビューカードに変換されます。

https://astro.build/

## インライン装飾

### 下線とハイライト

++下線テキスト++ と ==ハイライトテキスト== が使えます。クラスを付けることもできます。

++波線下線++{.wavy}

色付きテキストも用意されています。

[赤]{.red} [ピンク]{.pink} [オレンジ]{.orange} [黄]{.yellow} [緑]{.green} [水色]{.aqua} [青]{.blue} [紫]{.purple} [灰]{.grey}

==虹色=={.rainbow} のようなグラデーションも可能です。

キーボード風の表示: [Ctrl]{.kbd} + [C]{.kbd}

ラベル: [デフォルト]{.label .default} [主要]{.label .primary} [情報]{.label .info} [成功]{.label .success} [警告]{.label .warning} [危険]{.label .danger}

### 上下付き文字

H~2~O や E = mc^2^ のように、添字が使えます。

### ルビと着重点

{漢字^かんじ} でルビ、{漢字^*} で着重点(中黒)が表示されます。

### スポイザー

!!ここはネタバレです!! のように、クリックするまで隠れます。

!!これはぼかしのまま表示!!{.blur}

## ブロック構文

### 提醒(note)ブロック

:::info
info ブロックです。
:::

:::success
success ブロックです。
:::

:::warning
warning ブロックです。
:::

:::danger no-icon
danger ブロックです。`no-icon` でアイコンを隠せます。
:::

入れ子にも対応しています。

:::primary
外側の primary ブロック。

:::info
内側の info ブロック。
:::

:::

### 折りたたみブロック

+++primary 詳細を表示
クリックで開閉できます。中身は段落でも箇条書きでもかまいません。

- 箇条書き1
- 箇条書き2
+++

+++info もうひとつ
別の折りたたみブロックです。
+++

### タブブロック

同じグループIDを連続させると、タブとして結合されます。

;;;install インストール
```bash
pnpm install
```
;;;

;;;install 使い方
```bash
pnpm dev
```
;;;

;;;install ビルド
```bash
pnpm build
```
;;;

## コードブロック

### 基本

```js
console.log('Hello, blog-hishaku!');
```

### タイトル・リンク・行ハイライト

```js title="hello.js" mark:1,3
console.log('1行目 (ハイライト)');
console.log('2行目');
console.log('3行目 (ハイライト)');
```

### コマンドプロンプト

```bash command:("$":1-2)
pnpm install
pnpm dev
```

### 折りたたみ対象(9行以上)

```text
1行目
2行目
3行目
4行目
5行目
6行目
7行目
8行目
9行目
10行目
```

8行を超えるコードブロックは自動で折りたたまれ、コピーボタンが付きます。

### フェンス付きコードの表示

````markdown
```js
// ここはコードブロック内のコードブロック
console.log('nested');
```
````

## 数式

インライン数式は $E = mc^2$ のように書きます。

ディスプレイ数式:

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

行列も使えます。

$$
\begin{pmatrix}
a & b \\
c & d
\end{pmatrix}
$$

## Hexoタグ風構文

### フレンドリンク

{% links %}
- site: Astro
  url: https://astro.build/
  owner: Astro Team
  desc: モダンなWebフレームワーク
- site: MDN
  url: https://developer.mozilla.org/
  owner: Mozilla
  desc: Web技術のリファレンス
{% endlinks %}

### メディア

{% media video %}
- name: サンプル動画
  url: https://example.com/sample.mp4
{% endmedia %}

## 属性構文

インライン属性: [テキスト]{.wavy} のように、要素にクラスを直接付与できます。

リンク属性: [Astro公式](https://astro.build/){.external}

リスト項目にも属性を付けられます。

- 通常の項目
- クラス付きの項目 {.primary}

## エスケープ

\++これは下線になりません++ \==これはハイライトになりません==

## まとめ

このページで紹介した構文を組み合わせることで、表現豊かな記事が書けます。実際の見た目はこのページそのものを参照してください。
