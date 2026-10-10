---
title: コードブロックの高度な機能
date: 2026-10-03 11:00:00
description: タイトル・行ハイライト・コマンドプロンプト・自動折りたたみなど、Shikiベースのコードブロック拡張機能を紹介します。
tags:
  - サンプル
  - コード
categories:
  - ツール
keywords:
  - Shiki
  - コードブロック
  - syntax highlighting
---

blog-hishaku のコードブロックは Shiki によるシンタックスハイライトに加えて、メタ文字列による拡張機能を持っています。この記事では各機能を実例付きで紹介します。

## タイトル表示

コードフェンスの info 文字列に `title="ファイル名"` を指定すると、コード枠のヘッダにファイル名が表示されます。

```js title="hello.js"
export function hello(name) {
  return `Hello, ${name}!`;
}

hello('blog-hishaku');
```

`url` と `linkText` を併用すると、ソースリンクも表示できます。

```ts title="config.ts" url="https://astro.build/" linkText="Source"
export const config = {
  site: 'https://example.com',
};
```

## 行ハイライト

`mark:行番号` で特定の行をハイライトできます。範囲指定も可能です。

```js title="marked.js" mark:1,3-4
const first = '1行目はハイライト';
const second = '2行目は通常';
const third = '3行目はハイライト';
const fourth = '4行目もハイライト';
```

## コマンドプロンプト

`command:("$":行番号範囲)` でシェルのプロンプト風表示を付けられます。`$` はユーザー、`#` は root を表します。

```bash command:("$":1-2)
pnpm install
pnpm dev
```

```bash command:("#":1)
rm -rf node_modules
```

## 自動折りたたみとコピーボタン

コードが8行を超えると自動で折りたたまれ、ヘッダに展開ボタンとコピーボタンが付きます。

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

8行以下のコードは展開されたまま表示され、コピーボタンのみ付きます。

```js
console.log('8行以内は折りたたまれません');
```

## メタ文字列まとめ

| 記法 | 効果 |
| --- | --- |
| `title="app.js"` | コード枠のヘッダにタイトル表示 |
| `url="…"` | ヘッダにソースURLを表示 |
| `linkText="Source"` | ソースリンクの表示文言 |
| `mark:1,3-5` | 該当行をハイライト |
| `command:("$":1-2)` | 該当行にプロンプト表示 |
