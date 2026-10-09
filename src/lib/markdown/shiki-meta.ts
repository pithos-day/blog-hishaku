/**
 * Shiki transformer: コードブロックのメタ文字列パース
 *
 * ```js title="hello.js" url="https://..." linkText="Source" mark:1,3-5 command:("$":1-3)
 *
 * <pre> へ data 属性を付与し、line() で行ハイライト・プロンプトを適用する。
 */
import type { ShikiTransformer } from 'shiki';

interface CodeMeta {
  title?: string;
  url?: string;
  linkText?: string;
  mark?: string;
  command?: string;
}

function parseMeta(meta: string | undefined): CodeMeta | null {
  if (!meta) return null;
  const result: CodeMeta = {};

  const kvRegex = /(\w+)="([^"]*)"/g;
  for (let match = kvRegex.exec(meta); match !== null; match = kvRegex.exec(meta)) {
    if (match[1] === 'title') result.title = match[2];
    else if (match[1] === 'url') result.url = match[2];
    else if (match[1] === 'linkText') result.linkText = match[2];
  }

  const markMatch = meta.match(/mark:([\d,-]+)/);
  if (markMatch) result.mark = markMatch[1];

  const commandMatch = meta.match(/command:\(([^)]+)\)/);
  if (commandMatch) result.command = commandMatch[1];

  if (!result.title && !result.url && !result.mark && !result.command) return null;
  return result;
}

/** `1,3-5` 形式の範囲を実際の行数に展開して集合で返す */
function expandLineRanges(rangeStr: string, lineCount: number): Set<number> {
  const lines = new Set<number>();
  if (lineCount === 0) return lines;

  const rangeRegex = /(\d+)(?:-(\d+))?/g;
  for (let match = rangeRegex.exec(rangeStr); match !== null; match = rangeRegex.exec(rangeStr)) {
    const start = Math.max(1, Number(match[1]));
    const end = Math.min(lineCount, Number(match[2] ?? match[1]));
    if (!Number.isFinite(start) || start > end) continue;
    for (let line = start; line <= end; line++) lines.add(line);
  }
  return lines;
}

/** `"$":1-3,"#":4-5` 形式をプロンプト → 行集合へ展開する */
function parseCommand(commandStr: string, lineCount: number): Record<string, Set<number>> {
  const result: Record<string, Set<number>> = {};
  const pairRegex = /"([^"]+)":([\d,-]+)/g;
  for (let match = pairRegex.exec(commandStr); match !== null; match = pairRegex.exec(commandStr)) {
    result[match[1]] = expandLineRanges(match[2], lineCount);
  }
  return result;
}

export function shokaMetaTransformer(): ShikiTransformer {
  // pre() でパースし line() で参照する — ブロックごとにリセットして横断漏れを防ぐ
  let markLines: Set<number> | null = null;
  let commands: Record<string, Set<number>> | null = null;

  return {
    name: 'shoka-meta',
    pre(node) {
      markLines = null;
      commands = null;

      const meta = parseMeta(this.options.meta?.__raw);
      if (!meta) return;

      if (meta.title) node.properties['data-title'] = meta.title;
      if (meta.url) node.properties['data-url'] = meta.url;
      if (meta.linkText) node.properties['data-link-text'] = meta.linkText;
      if (meta.mark) {
        node.properties['data-mark'] = meta.mark;
        markLines = expandLineRanges(meta.mark, this.tokens.length);
      }
      if (meta.command) {
        node.properties['data-command'] = meta.command;
        commands = parseCommand(meta.command, this.tokens.length);
      }
    },
    line(node, line) {
      if (markLines?.has(line)) {
        node.properties.class = `${node.properties.class || ''} line-highlight`.trim();
      }
      if (commands) {
        for (const [prompt, lines] of Object.entries(commands)) {
          if (lines.has(line)) {
            node.properties['data-prompt'] = prompt;
            node.properties.class = `${node.properties.class || ''} has-prompt`.trim();
            break;
          }
        }
      }
    },
  };
}
