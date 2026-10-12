/**
 * Shoka 構文の前処理 (remark パース前の生テキスト変換)。
 *
 * 以下の構文は標準 Markdown/GFM と衝突するため、パース前に HTML へ変換する:
 * - `+++style Title`  → thematicBreak として解釈されてしまう
 * - `~sub~`           → GFM の strikethrough と衝突する
 * - `{% links %}` の YAML 中身 → Markdown のリストとして解釈されてしまう
 * - `:::type` / `;;id name` の中身にリストを含むと入れ子が壊れる
 *
 * インライン構文 (++ins++ ==mark== !!spoiler!! ルビ) は Markdown と衝突しないため
 * remark プラグイン (remark-effects / remark-spoiler / remark-ruby) で処理する。
 */
import { parse as parseYaml } from 'yaml';
import { escapeHtml } from './escape';
import {
  type FriendLinkData,
  type MediaItem,
  renderAudioMedia,
  renderFriendLinks,
  renderVideoMedia,
} from './renderers';
import { SHOKA_RUBY_PATTERN } from './ruby-pattern';

/** Remix Icon (ri) の SVG path — note ブロックのアイコン (ビルド時インジェクト) */
const NOTE_ICON_PATHS: Record<string, string> = {
  default:
    'M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12S6.48 2 12 2m0 9H8v2h4v3l4-4l-4-4z',
  primary:
    'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m-1-11H7v2h4v4h2v-4h4v-2h-4V7h-2z',
  info: 'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m-1-11v6h2v-6zm0-4v2h2V7z',
  success:
    'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2S2 6.477 2 12s4.477 10 10 10m5.457-12.543L11 15.914l-4.207-4.207l1.414-1.414L11 13.086l5.043-5.043z',
  warning:
    'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10m-1-7v2h2v-2zm0-8v6h2V7z',
  danger: 'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10s-4.477 10-10 10M7 11v2h10v-2z',
};

/** note ブロック用の SVG アイコン文字列を生成 */
function noteIconSvg(style: string): string {
  const path = NOTE_ICON_PATHS[style] ?? NOTE_ICON_PATHS.default;
  return `<svg class="note-icon note-icon-${style}" xmlns="http://www.w3.org/2000/svg" width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`;
}

export interface PreprocessOptions {
  /** `:::` `+++` `;;;` ブロック構文を有効化 */
  containers?: boolean;
  /** `{% links %}` `{% media %}` Hexo タグを有効化 */
  hexoTags?: boolean;
  /** `~sub~` `^sup^` を有効化 (enableShokaEffects がゲート) */
  superSub?: boolean;
  /** 再パース側の math 拡張 (remarkShokaPreprocess 専用 — preprocessor では未使用) */
  math?: boolean;
}

/** ブロック入れ子の最大深度 (暴走防止) */
const MAX_CONTAINER_DEPTH = 10;

/** ブロック構文のハンドラが返す解析結果 */
interface ParsedBlock {
  /** 続きを読むべき行インデックス */
  next: number;
  /** ブロックから生成した HTML 行 */
  output: string[];
}

/** 保留中のタブパネル 1 つ分 */
interface PendingTab {
  name: string;
  lines: string[];
}

/** `:::type [no-icon]` の開始行 */
const NOTE_OPEN_PATTERN = /^:::(\w+)(?:\s+(no-icon))?\s*$/;

/** `+++style Title` の開始行 */
const COLLAPSE_OPEN_PATTERN = /^\+\+\+(\w+)\s+(.+)$/;

/** `;;;groupId TabName` の開始行 */
const TAB_OPEN_PATTERN = /^;;;(\S+)\s+(.+)$/;

/** 閉じタグに一致する間、行を消費しながら中身を収集する */
function collectBlock(
  lines: string[],
  start: number,
  isOpen: (line: string) => boolean,
  isClose: (line: string) => boolean,
): { inner: string[]; next: number } {
  const inner: string[] = [];
  let i = start;
  let depth = 1;
  while (i < lines.length && depth > 0) {
    if (isClose(lines[i])) {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    } else if (isOpen(lines[i])) {
      depth++;
    }
    inner.push(lines[i]);
    i++;
  }
  return { inner, next: i };
}

/** 確定済みのタブグループを HTML 行として生成する */
function renderTabGroup(
  groupId: string,
  tabs: PendingTab[],
  opts: PreprocessOptions,
  depth: number,
): string[] {
  const output: string[] = [];
  output.push('');
  output.push(`<div class="tab-group" data-tab-group="${escapeHtml(groupId)}">`);
  output.push('<div class="tab-headers" role="tablist">');
  for (let t = 0; t < tabs.length; t++) {
    const active = t === 0;
    output.push(
      `<button class="tab-header${active ? ' active' : ''}" role="tab" aria-selected="${active}"` +
        ` data-tab-index="${t}" data-tab-group="${escapeHtml(groupId)}">${escapeHtml(tabs[t].name)}</button>`,
    );
  }
  output.push('</div>');
  for (let t = 0; t < tabs.length; t++) {
    const active = t === 0;
    output.push(
      `<div class="tab-panel${active ? ' active' : ''}" role="tabpanel" data-tab-index="${t}">`,
    );
    output.push('');
    output.push(processBlocks(tabs[t].lines.join('\n'), opts, depth + 1));
    output.push('');
    output.push('</div>');
  }
  output.push('</div>');
  output.push('');
  return output;
}

/** `:::type [no-icon] ... :::` を note ブロックの HTML に変換 */
function handleNoteBlock(
  lines: string[],
  start: number,
  opts: PreprocessOptions,
  depth: number,
): ParsedBlock | null {
  if (opts.containers === false) return null;
  const match = lines[start].match(NOTE_OPEN_PATTERN);
  if (!match) return null;
  const style = match[1];
  const noIcon = match[2] === 'no-icon';
  const { inner, next } = collectBlock(
    lines,
    start + 1,
    (l) => NOTE_OPEN_PATTERN.test(l),
    (l) => /^:::\s*$/.test(l),
  );
  const noIconClass = noIcon ? ' no-icon' : '';
  const output: string[] = [];
  output.push('');
  output.push(`<div class="note-block note-${style}${noIconClass}">`);
  if (!noIcon) {
    output.push(noteIconSvg(style));
  }
  output.push('');
  output.push(processBlocks(inner.join('\n'), opts, depth + 1));
  output.push('');
  output.push('</div>');
  output.push('');
  return { next, output };
}

/** `+++style Title ... +++` を details 要素に変換 */
function handleCollapseBlock(
  lines: string[],
  start: number,
  opts: PreprocessOptions,
  depth: number,
): ParsedBlock | null {
  if (opts.containers === false) return null;
  const match = lines[start].match(COLLAPSE_OPEN_PATTERN);
  if (!match) return null;
  const style = match[1];
  const title = match[2];
  const { inner, next } = collectBlock(
    lines,
    start + 1,
    (l) => /^\+\+\+\w+\s+.+$/.test(l),
    (l) => /^\+\+\+\s*$/.test(l),
  );
  const output: string[] = [];
  output.push('');
  output.push(`<details class="collapse-block collapse-${style}">`);
  output.push(`<summary>${escapeHtml(title)}</summary>`);
  output.push('<div class="collapse-content">');
  output.push('');
  output.push(processBlocks(inner.join('\n'), opts, depth + 1));
  output.push('');
  output.push('</div>');
  output.push('</details>');
  output.push('');
  return { next, output };
}

/** `;;;groupId TabName ... ;;;` を解析 (グループ結合は呼び出し側の保留状態で行う) */
function handleTabBlock(
  lines: string[],
  start: number,
  opts: PreprocessOptions,
): { next: number; id: string; name: string; inner: string[] } | null {
  if (opts.containers === false) return null;
  const match = lines[start].match(TAB_OPEN_PATTERN);
  if (!match) return null;
  const { inner, next } = collectBlock(
    lines,
    start + 1,
    (l) => /^;;;\S+\s+.+$/.test(l),
    (l) => /^;;;\s*$/.test(l),
  );
  return { next, id: match[1], name: match[2], inner };
}

/** `{% links %} ... {% endlinks %}` の YAML をカード一覧に変換 */
function handleLinksTag(
  lines: string[],
  start: number,
  opts: PreprocessOptions,
): ParsedBlock | null {
  if (opts.hexoTags === false) return null;
  if (lines[start].trim() !== '{% links %}') return null;
  // YAML はネストしないため開き側の判定は常に false (閉じタグまで収集するだけ)
  const { inner, next } = collectBlock(
    lines,
    start + 1,
    () => false,
    (l) => l.trim() === '{% endlinks %}',
  );
  const output: string[] = [];
  try {
    const data = parseYaml(inner.join('\n')) as FriendLinkData[];
    if (Array.isArray(data)) {
      output.push('');
      output.push(renderFriendLinks(data));
      output.push('');
    }
  } catch {
    output.push('<!-- links YAML の解析に失敗しました -->');
  }
  return { next, output };
}

/** `{% media audio|video %} ... {% endmedia %}` の YAML をメディアに変換 */
function handleMediaTag(
  lines: string[],
  start: number,
  opts: PreprocessOptions,
): ParsedBlock | null {
  if (opts.hexoTags === false) return null;
  const match = lines[start].trim().match(/^{% media (audio|video) %}$/);
  if (!match) return null;
  const mediaType = match[1];
  // YAML はネストしないため開き側の判定は常に false (links と同じ収集)
  const { inner, next } = collectBlock(
    lines,
    start + 1,
    () => false,
    (l) => l.trim() === '{% endmedia %}',
  );
  const output: string[] = [];
  try {
    const data = parseYaml(inner.join('\n')) as MediaItem[];
    if (Array.isArray(data)) {
      const html = mediaType === 'audio' ? renderAudioMedia(data) : renderVideoMedia(data);
      if (html) {
        output.push('');
        output.push(html);
        output.push('');
      }
    }
  } catch {
    output.push('<!-- media YAML の解析に失敗しました -->');
  }
  return { next, output };
}

function processBlocks(text: string, opts: PreprocessOptions, depth = 0): string {
  if (depth >= MAX_CONTAINER_DEPTH) return text;
  const lines = text.split(/\r?\n/);
  const output: string[] = [];
  let i = 0;

  // 連続する同 id の ;;; ブロックを 1 グループに結合するための保留状態
  let pendingTabId: string | null = null;
  let pendingTabs: PendingTab[] = [];

  const flushTabs = (): void => {
    if (pendingTabs.length === 0 || !pendingTabId) return;
    output.push(...renderTabGroup(pendingTabId, pendingTabs, opts, depth));
    pendingTabs = [];
    pendingTabId = null;
  };

  // コードフェンス内は構文を処理しない
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;

  while (i < lines.length) {
    const line = lines[i];

    const fenceMatch = line.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const char = fenceMatch[1][0];
      const len = fenceMatch[1].length;
      if (!inFence) {
        inFence = true;
        fenceChar = char;
        fenceLen = len;
        flushTabs();
        output.push(line);
        i++;
        continue;
      }
      if (char === fenceChar && len >= fenceLen && /^(`{3,}|~{3,})\s*$/.test(line)) {
        inFence = false;
        fenceChar = '';
        fenceLen = 0;
        output.push(line);
        i++;
        continue;
      }
    }
    if (inFence) {
      output.push(line);
      i++;
      continue;
    }

    const note = handleNoteBlock(lines, i, opts, depth);
    if (note) {
      flushTabs();
      output.push(...note.output);
      i = note.next;
      continue;
    }

    const collapse = handleCollapseBlock(lines, i, opts, depth);
    if (collapse) {
      flushTabs();
      output.push(...collapse.output);
      i = collapse.next;
      continue;
    }

    const tab = handleTabBlock(lines, i, opts);
    if (tab) {
      if (pendingTabId === tab.id) {
        pendingTabs.push({ name: tab.name, lines: tab.inner });
      } else {
        flushTabs();
        pendingTabId = tab.id;
        pendingTabs = [{ name: tab.name, lines: tab.inner }];
      }
      i = tab.next;
      continue;
    }

    const links = handleLinksTag(lines, i, opts);
    if (links) {
      flushTabs();
      output.push(...links.output);
      i = links.next;
      continue;
    }

    const media = handleMediaTag(lines, i, opts);
    if (media) {
      flushTabs();
      output.push(...media.output);
      i = media.next;
      continue;
    }

    // 空行ではタブグループを確定しない (;;  ブロック間の空行はグループ内)
    if (pendingTabId && line.trim() === '') {
      i++;
      continue;
    }
    flushTabs();
    output.push(line);
    i++;
  }

  flushTabs();
  return output.join('\n');
}

/**
 * エスケープされた区切り文字を処理する。
 * `\++` → `+<!-- -->+` (トークンの対破壊によりリテラル ++ として残る)。
 * パーサがバックスラッシュを消費する前に処理する必要がある。
 */
function processEscapedDelimiters(text: string): string {
  text = text.replace(/\\([+=!])\\\1/g, '$1<!-- -->$1');
  text = text.replace(/\\([+=!])\1(?!\1)/g, '$1<!-- -->$1');
  return text;
}

/** パーサが消費してしまわないよう保護する領域 (コード・数式・ルビ) のパターン */
function protectedRegions(protectRuby: boolean): RegExp {
  const base =
    '^`{3,}.*\\n[\\s\\S]*?^`{3,}\\s*$' +
    '|^~{3,}.*\\n[\\s\\S]*?^~{3,}\\s*$' +
    '|`[^`\\n]+`' +
    '|\\$\\$[\\s\\S]*?\\$\\$' +
    '|\\$[^$\\n]+?\\$';
  const source = protectRuby ? `${base}|${SHOKA_RUBY_PATTERN.source}` : base;
  return new RegExp(`(${source})`, 'gm');
}

/** 保護領域の外側だけに変換関数を適用する */
function mapOutsideProtected(
  text: string,
  fn: (segment: string) => string,
  options: { protectRuby?: boolean } = {},
): string {
  const pattern = protectedRegions(options.protectRuby ?? false);
  const parts: string[] = [];
  let lastIndex = 0;
  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    if (match.index > lastIndex) {
      parts.push(fn(text.slice(lastIndex, match.index)));
    }
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(fn(text.slice(lastIndex)));
  }
  // 空文字入力のみ parts が空になるが、その場合も join 結果は '' で fn('') と同値
  // (両呼び出し元は pure な replace 連鎖)。そのため三項は不要。
  return parts.join('');
}

/** `~sub~` `^sup^` を HTML に変換 (GFM strikethrough 衝突回避のためパース前) */
function processInlineSuperSub(text: string): string {
  return mapOutsideProtected(
    text,
    (segment) => {
      segment = segment.replace(
        /(?<![~\\])~([^~\s]+)~(?!~)/g,
        (_, content: string) => `<sub>${escapeHtml(content)}</sub>`,
      );
      segment = segment.replace(
        /(?<![\\^])\^([^^\s]+)\^/g,
        (_, content: string) => `<sup>${escapeHtml(content)}</sup>`,
      );
      return segment;
    },
    { protectRuby: true },
  );
}

/** 前処理の本体。remark パース前に呼ぶこと。 */
export function preprocessShokaMarkdown(source: string, options?: PreprocessOptions): string {
  let result = source;

  if (options?.containers !== false || options?.hexoTags !== false) {
    result = processBlocks(result, {
      containers: options?.containers,
      hexoTags: options?.hexoTags,
    });
  }

  result = mapOutsideProtected(result, processEscapedDelimiters);

  if (options?.superSub !== false) {
    result = processInlineSuperSub(result);
  }

  return result;
}
