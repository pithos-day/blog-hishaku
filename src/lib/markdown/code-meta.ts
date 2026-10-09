/**
 * Shiki transformer: コードブロックのメタ文字列解釈
 *
 * ```js title="app.js" url="https://example.com" linkText="Source" mark:1,3-5 command:("$":1-3)
 *
 * <pre> の data 属性と行クラスへ反映する。
 * shiki のフックは line() → code() → pre() の順で走るため、
 * line() から参照できるようパース結果を直近1ブロック分だけ保持する。
 * ブロックは同期処理で1つずつ走るため単一スロットで足りる。
 */
import type { ShikiTransformer } from 'shiki';

interface BlockMeta {
  title?: string;
  url?: string;
  linkText?: string;
  /** mark 指定された行番号 */
  marked: Set<number>;
  /** プロンプト文字 → 行番号集合 */
  prompts: Map<string, Set<number>>;
}

/** key="value" 形式の属性を読み取る */
function readAttributes(source: string): Pick<BlockMeta, 'title' | 'url' | 'linkText'> {
  const found: { title?: string; url?: string; linkText?: string } = {};
  for (const match of source.matchAll(/(\w+)="([^"]*)"/g)) {
    if (match[1] === 'title') found.title = match[2];
    else if (match[1] === 'url') found.url = match[2];
    else if (match[1] === 'linkText') found.linkText = match[2];
  }
  return found;
}

/** "1,3-5" 形式の範囲表記を行番号集合へ展開する */
function expandRanges(spec: string, totalLines: number): Set<number> {
  const result = new Set<number>();
  for (const part of spec.split(',')) {
    const range = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!range) continue;
    const from = Math.max(1, Number(range[1]));
    const to = Math.min(totalLines, Number(range[2] ?? range[1]));
    if (from > to) continue;
    for (let line = from; line <= to; line++) result.add(line);
  }
  return result;
}

/** command:("$":1-3,"#":4-5) 形式を Map へ展開する */
function expandPrompts(spec: string, totalLines: number): Map<string, Set<number>> {
  const result = new Map<string, Set<number>>();
  for (const match of spec.matchAll(/"([^"]+)":([\d,-]+)/g)) {
    result.set(match[1], expandRanges(match[2], totalLines));
  }
  return result;
}

/** 直近にパースしたブロックのキャッシュ (行数込みのキーで照合) */
let cacheKey: string | undefined;
let cacheMeta: BlockMeta | undefined;

function resolveMeta(raw: string | undefined, totalLines: number): BlockMeta | undefined {
  if (!raw) return;
  const key = `${totalLines}\0${raw}`;
  if (key === cacheKey && cacheMeta) return cacheMeta;

  const attrs = readAttributes(raw);
  const markSpec = raw.match(/mark:([\d,-]+)/)?.[1];
  const promptSpec = raw.match(/command:\(([^)]+)\)/)?.[1];

  const meta: BlockMeta = {
    ...attrs,
    marked: markSpec ? expandRanges(markSpec, totalLines) : new Set(),
    prompts: promptSpec ? expandPrompts(promptSpec, totalLines) : new Map(),
  };

  cacheKey = key;
  cacheMeta = meta;
  return meta;
}

export function codeMetaTransformer(): ShikiTransformer {
  return {
    name: 'code-meta',
    line(node, index) {
      const meta = resolveMeta(this.options.meta?.__raw, this.tokens.length);
      if (!meta) return;

      if (meta.marked.has(index)) {
        node.properties.class = `${node.properties.class ?? ''} code-line--marked`.trim();
      }
      for (const [prompt, lines] of meta.prompts) {
        if (lines.has(index)) {
          node.properties['data-code-prompt'] = prompt;
          node.properties.class = `${node.properties.class ?? ''} code-line--prompted`.trim();
          break;
        }
      }
    },
    pre(node) {
      const meta = resolveMeta(this.options.meta?.__raw, this.tokens.length);
      if (!meta) return;

      if (meta.title) node.properties['data-code-title'] = meta.title;
      if (meta.url) node.properties['data-code-url'] = meta.url;
      if (meta.linkText) node.properties['data-code-link'] = meta.linkText;
    },
  };
}
