/**
 * toPlainText の単体テスト。
 *
 * 一覧の抜粋・OGP description にそのまま流れ、かつ「構文記号が残ってはいけない」
 * という理由で壊れやすい箇所 (Shoka 拡張構文・ブロック構文・コード) を固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { toPlainText } from '../src/lib/text.ts';

test('toPlainText: 標準 Markdown の記号を残さずに本文だけを取り出す', () => {
  const markdown = [
    '# 見出し',
    '',
    '**太字**と*斜体*と~~取り消し線~~。',
    '',
    '- 項目1',
    '- [x] 完了したタスク',
    '',
    '> 引用です。',
    '',
    '| 構文 | 種別 |',
    '| --- | --- |',
    '| `**太字**` | 強調 |',
    '',
    '[リンク](https://example.com/)と![画像](/img.png)。',
  ].join('\n');

  assert.equal(
    toPlainText(markdown),
    '太字と斜体と取り消し線。 項目1 完了したタスク 引用です。 構文 種別 **太字** 強調 リンクと。',
  );
});

test('toPlainText: 見出しの文字は出力に含めない', () => {
  assert.equal(toPlainText('## 見出し\n\nこれが本文です'), 'これが本文です');
  // Setext 見出し・引用内の見出しも同様に落とす
  assert.equal(toPlainText('見出し\n===\n\nこれが本文です'), 'これが本文です');
  assert.equal(toPlainText('> ## 引用内の見出し\n>\n> 引用の本文です'), '引用の本文です');
  // 生の HTML 見出しも落とす
  assert.equal(toPlainText('<h2>見出し</h2>\n\nこれが本文です'), 'これが本文です');
  // 見出しだけの記事は空になる
  assert.equal(toPlainText('# 見出しだけ'), '');
});

test('toPlainText: Shoka のインライン構文は中身だけ残して記号を消す', () => {
  const markdown = [
    '==test== と ++下線++ と !!ネタバレ!! と {漢字^かんじ} と {重要^*}。',
    '',
    'H~2~O、x~i~、E = mc^2^、第n^章^。',
    '',
    '[赤]{.red} [キーボード]{.kbd} ==虹色=={.rainbow} ++波線++{.wavy}',
    '',
    'リンクにクラス付与: [Astro公式](https://astro.build/){.external}',
  ].join('\n');

  const text = toPlainText(markdown);
  assert.equal(
    text,
    'test と 下線 と ネタバレ と 漢字(かんじ) と 重要。 ' +
      'H2O、xi、E = mc2、第n章。 ' +
      '赤 キーボード 虹色 波線 ' +
      'リンクにクラス付与: Astro公式',
  );
  assert.doesNotMatch(text, /==|\+\+|!!|\{|\}|\[|\]/);
});

test('toPlainText: インライン絵文字は alt の中身だけ残す', () => {
  assert.equal(
    toPlainText('走る人: :emoji[/img/emojis/person_running_right_animated.gif]{alt="🏃‍➡️"} です。'),
    '走る人: 🏃‍➡️ です。',
  );
  assert.equal(toPlainText(':emoji[/img/emojis/smile.png]'), '');
});

test('toPlainText: ブロック構文のマーカーと中身の YAML を落とす', () => {
  const markdown = [
    ':::info',
    'info ブロックの中身です。',
    ':::',
    '',
    '+++primary 詳細を表示',
    'クリックで開閉できます。',
    '+++',
    '',
    ';;;install インストール',
    'タブの中身の文章も残ります。',
    ';;;',
    '',
    '{% links %}',
    '- site: Astro',
    '  url: https://astro.build/',
    '  desc: モダンなWebフレームワーク',
    '{% endlinks %}',
  ].join('\n');

  const text = toPlainText(markdown);
  assert.equal(
    text,
    'info ブロックの中身です。 詳細を表示 クリックで開閉できます。 タブの中身の文章も残ります。',
  );
  assert.doesNotMatch(text, /:::|\+\+\+|;;;|site:|url:|{%|%}/);
});

test('toPlainText: コードブロックとインラインコードの扱い', () => {
  const markdown = [
    '```js',
    'const a = "```"; // ==test==',
    '```',
    '',
    'インラインは `description` です。',
  ].join('\n');

  assert.equal(toPlainText(markdown), 'インラインは description です。');
});

test('toPlainText: エスケープされた記号も抜粋では記号を出さない', () => {
  assert.equal(toPlainText('\\==これはハイライトになりません=='), 'これはハイライトになりません');
  assert.equal(toPlainText('\\++これは下線になりません++'), 'これは下線になりません');
});

test('toPlainText: 通常の `=` とコードはそのまま残す', () => {
  assert.equal(toPlainText('値を `a = b` に設定する。'), '値を a = b に設定する。');
  assert.equal(
    toPlainText('E = mc^2 のように式が文中にあってもよい。'),
    'E = mc^2 のように式が文中にあってもよい。',
  );
});

test('toPlainText: 数式はデリミタだけ外して中身を残す', () => {
  assert.equal(toPlainText('インライン数式は $E = mc^2$。'), 'インライン数式は E = mc^2。');
  // ディスプレイ数式は LaTeX の生コードなので抜粋には出さない
  assert.equal(toPlainText('$$\n\\int_{-\\infty}^{\\infty} e^{-x^2}\n$$'), '');
});

test('toPlainText: 脚注は参照番号を落として本文だけ残す', () => {
  assert.equal(
    toPlainText('脚注の参照[^note]は後ろに定義。\n\n[^note]: これが脚注の本文。'),
    '脚注の参照は後ろに定義。 これが脚注の本文。',
  );
});

test('toPlainText: 空文字列はそのまま返す', () => {
  assert.equal(toPlainText(''), '');
});
