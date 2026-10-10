---
title: 数式(KaTeX)の書き方
date: 2026-10-03 15:00:00
math: true
description: インライン数式・ディスプレイ数式・行列など、KaTeXで使える数式構文の見本記事です。
tags:
  - サンプル
  - 数学
categories:
  - ツール
keywords:
  - KaTeX
  - 数式
  - math
---

blog-hishaku は KaTeX による数式レンダリングに対応しています。frontmatter の `math: false` で記事単位で数式CSSを無効化できます(既定は有効)。

## インライン数式

インライン数式は `$...$` で書きます。例えば、質量エネルギー等価な関係は $E = mc^2$、円の面積は $S = \pi r^2$ です。

## ディスプレイ数式

$$
\frac{\partial}{\partial t} \rho + \nabla \cdot (\rho \mathbf{v}) = 0
$$

### サンプル公式

二次方程式の解の公式:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

### 行列

$$
\mathbf{A} =
\begin{pmatrix}
a_{11} & a_{12} & \cdots & a_{1n} \\
a_{21} & a_{22} & \cdots & a_{2n} \\
\vdots & \vdots & \ddots & \vdots \\
a_{m1} & a_{m2} & \cdots & a_{mn}
\end{pmatrix}
$$

### 連立式

$$
\begin{cases}
x + y = 3 \\
2x - y = 0
\end{cases}
$$

### 積分と級数

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

$$
\int_0^1 x^n \, dx = \frac{1}{n+1} \quad (n \geq 0)
$$

### 組み合わせ

$$
\binom{n}{k} = \frac{n!}{k!(n-k)!}
$$

## frontmatter

数式を使わない記事では `math: false` を指定すると、記事ページに KaTeX の CSS を読み込まなくなります。

```yaml
---
title: 数学を扱わない記事
math: false
---
```

数式を含む記事では `math: true` か省略(既定 true)にします。
