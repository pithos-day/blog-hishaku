/**
 * Markdown 本文から表示用のプレーンテキストを取り出す。
 *
 * 記事一覧の抜粋・OGP description・文字数カウントで使う。
 * 見出しは本文の説明ではないため、抜粋に混ざらないよう中身ごと除外する。
 * 正規表現で構文を列挙すると Shoka 拡張構文を取りこぼして記号がそのまま残る
 * ため、本文レンダラと同じ前処理を当てたうえで remark にパースさせ、
 * テキストノードとインライン HTML の中身だけを集める。
 */
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { preprocessShokaMarkdown } from './markdown/preprocessor';
import { remarkIns, remarkMark } from './markdown/remark-effects';
import { remarkShokaRuby } from './markdown/remark-ruby';
import { remarkShokaSpoiler } from './markdown/remark-spoiler';

/** mdast ノード (本文抽出に必要な子と値だけを持つ最小形) */
interface PlainNode {
  type: string;
  value?: string;
  children?: PlainNode[];
}

/** 段落境界。ブロックの後ろに改行を入れて単語が連結するのを防ぐ */
const BLOCK_NODES = new Set([
  'paragraph',
  'blockquote',
  'listItem',
  'tableCell',
  'footnoteDefinition',
]);

/**
 * 中身ごと落とす HTML 要素。
 * preprocessor が生成するコンテナ (note・タブ・折りたたみ・リンクカード・メディア) は
 * タグを外すと中身のラベルやカード本文まで抜粋に混ざるため、丸ごと捨てる。
 * `div` だけは本文中の素の `<div>` を残すため、ラッパに付く class を持つものに限る。
 */
const DROPPED_HTML_ELEMENTS = new Set([
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'pre',
  'script',
  'style',
  'video',
  'audio',
  'iframe',
  'svg',
]);

/** 落とす対象かどうか (div は renderer のラッパ class を持つときだけ) */
function isDroppedElement(name: string, attributes: string): boolean {
  if (!DROPPED_HTML_ELEMENTS.has(name)) return false;
  if (name !== 'div') return true;
  return /\bclass\s*=/.test(attributes);
}

/** escapeHtml() が生成しうる文字参照 */
const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

const ENTITY_PATTERN = /&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-fA-F]+);/g;

/** HTML エンティティを戻す (プラグインはテキストを escapeHtml で包むため) */
function decodeEntities(text: string): string {
  return text.replace(ENTITY_PATTERN, (entity) => {
    const named = NAMED_ENTITIES[entity];
    if (named !== undefined) return named;
    const code = entity.startsWith('&#x')
      ? Number.parseInt(entity.slice(3), 16)
      : Number.parseInt(entity.slice(2), 10);
    if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return entity;
    return String.fromCodePoint(code);
  });
}

/** インライン HTML ノードをテキストにする (落とす要素の中身は取り込まない) */
function htmlToText(html: string): string {
  const source = html.replace(/<!--[\s\S]*?-->/g, '');
  const pattern = /<(\/?)([A-Za-z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let text = '';
  /** 落とす要素の開きタグ (入れ子に対応するためスタックで持つ) */
  const dropped: string[] = [];
  let cursor = 0;

  for (let match = pattern.exec(source); match !== null; match = pattern.exec(source)) {
    if (dropped.length === 0) text += source.slice(cursor, match.index);
    cursor = match.index + match[0].length;

    const name = match[2].toLowerCase();
    if (match[1] === '/') {
      if (dropped[dropped.length - 1] === name) dropped.pop();
    } else if (!match[0].endsWith('/>')) {
      if (name === 'br') {
        if (dropped.length === 0) text += '\n';
      } else if (isDroppedElement(name, match[3])) {
        dropped.push(name);
      }
    }
  }
  if (dropped.length === 0) text += source.slice(cursor);

  return decodeEntities(text);
}

/** ツリーを走査してテキストだけを拾う (見出し・code ブロック・画像は除外) */
function collectText(node: PlainNode, out: string[]): void {
  if (node.type === 'heading') return;
  if (node.type === 'code') return;
  if (node.type === 'html') {
    out.push(htmlToText(node.value ?? ''));
    return;
  }
  if (node.type === 'break') {
    out.push('\n');
    return;
  }
  if (node.type === 'inlineCode') {
    // インラインコードは記事上も生の文字列なので触らない
    out.push(node.value ?? '');
    return;
  }
  if (node.type === 'math') return;
  if (node.type === 'inlineMath') {
    // デリミタ ($$) はノードに含まれないので中身だけ残す。
    // LaTeX は属性構文と紛れるので stripSyntax を通さない
    out.push(node.value ?? '');
    return;
  }
  if (typeof node.value === 'string') {
    // 連結して文中の空白は壊さず、記号だけ落とす
    out.push(stripSyntax(node.value));
    return;
  }
  for (const child of node.children ?? []) collectText(child, out);
  if (BLOCK_NODES.has(node.type)) out.push('\n');
}

/** コード以外のセグメントから Shoka / ブロック構文の残りを消す */
function stripSyntax(text: string): string {
  return (
    text
      // インライン絵文字 :emoji[url]{alt="🏃"} — 属性構文のルールが角括弧を
      // 落とす前に処理し、alt があれば残す
      .replace(
        /:emoji\[[^\]]*\](\{[^}\n]*\})?/g,
        (_match, attrs: string | undefined) =>
          /(?:^|[{[\s])alt="([^"]*)"/.exec(attrs ?? '')?.[1] ?? '',
      )
      // 属性構文: [テキスト]{.class} → テキスト
      .replace(/\[([^\]\n]*)\]\{[^}\n]+\}/g, '$1')
      // 直後の属性ブロック {.class #id key=value} / {key=value}
      .replace(/\s*\{(?:[.#][^}]*|[A-Za-z_-][\w-]*=[^}]*)\}/g, '')
      // preprocessor が対応しない Hexo タグ {% tag %} … {% endtag %}
      .replace(/\{%[^{}]*%\}/g, '')
      // 開始タグが消費されなかった閉じタグ
      .replace(/^\s*:::\s*$/gm, '')
  );
}

/**
 * エスケープでテキストノードが分割される (`\==x==` → `=` + `=x==`) 場合と
 * インラインコード内に残る場合に備え、連結後に記号を消して空白を整える
 */
function toReadableText(text: string): string {
  return text
    .replace(/==([^=\n]+)==/g, '$1')
    .replace(/\+\+([^+\n]+)\+\+/g, '$1')
    .replace(/!!([^!\n]+)!!/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** GFM まで含めて本文レンダラと同じ前提でパースする (初回 parse で freeze される) */
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  // 数式をテキストとして残すために先に走らせる (本文レンダラと同じ順序)
  .use(remarkMath)
  .use(remarkShokaSpoiler)
  .use(remarkShokaRuby)
  .use(remarkIns)
  .use(remarkMark);

/**
 * 同じ本文は何度も抜く (一覧の description と文字数で共有される) のでメモ化する。
 * `CACHE_MAX_ENTRIES` は保持するエントリ数の上限 (バイト数ではなく件数)。
 */
const CACHE_MAX_ENTRIES = 512;
const cache = new Map<string, string>();

/** パース → テキスト収集 → 可読化までを一気通貫で実行する */
function parseToPlainText(source: string): string {
  const tree = processor.runSync(processor.parse(source)) as unknown as PlainNode;
  const segments: string[] = [];
  collectText(tree, segments);
  return toReadableText(segments.join(''));
}

export function toPlainText(markdown: string): string {
  if (!markdown) return '';

  const cached = cache.get(markdown);
  if (cached !== undefined) return cached;

  const text = parseToPlainText(preprocessShokaMarkdown(markdown));

  // LRU ではなく上限到達時に全消去する。アクセス順の追跡が不要で、
  // 消去後も直近の本文は次の呼び出しで即座に再登録されるため十分。
  if (cache.size >= CACHE_MAX_ENTRIES) cache.clear();
  cache.set(markdown, text);
  return text;
}
