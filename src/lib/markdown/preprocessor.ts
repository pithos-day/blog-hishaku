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

function processBlocks(text: string, opts: PreprocessOptions, depth = 0): string {
  if (depth >= MAX_CONTAINER_DEPTH) return text;
  const containers = opts.containers !== false;
  const hexoTags = opts.hexoTags !== false;
  const lines = text.split(/\r?\n/);
  const output: string[] = [];
  let i = 0;

  // 連続する同 id の ;;; ブロックを 1 グループに結合するための保留状態
  let pendingTabId: string | null = null;
  let pendingTabs: { name: string; lines: string[] }[] = [];

  const flushTabs = (): void => {
    if (pendingTabs.length === 0 || !pendingTabId) return;
    const groupId = pendingTabId;
    output.push('');
    output.push(`<div class="tab-group" data-tab-group="${escapeHtml(groupId)}">`);
    output.push('<div class="tab-headers" role="tablist">');
    for (let t = 0; t < pendingTabs.length; t++) {
      const active = t === 0;
      output.push(
        `<button class="tab-header${active ? ' active' : ''}" role="tab" aria-selected="${active}"` +
          ` data-tab-index="${t}" data-tab-group="${escapeHtml(groupId)}">${escapeHtml(pendingTabs[t].name)}</button>`,
      );
    }
    output.push('</div>');
    for (let t = 0; t < pendingTabs.length; t++) {
      const active = t === 0;
      output.push(
        `<div class="tab-panel${active ? ' active' : ''}" role="tabpanel" data-tab-index="${t}">`,
      );
      output.push('');
      output.push(processBlocks(pendingTabs[t].lines.join('\n'), opts, depth + 1));
      output.push('');
      output.push('</div>');
    }
    output.push('</div>');
    output.push('');
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

    // :::type [no-icon] ... :::
    const noteMatch = containers && line.match(/^:::(\w+)(?:\s+(no-icon))?\s*$/);
    if (noteMatch) {
      flushTabs();
      const style = noteMatch[1];
      const noIcon = noteMatch[2] === 'no-icon';
      const { inner, next } = collectBlock(
        lines,
        i + 1,
        (l) => /^:::(\w+)(?:\s+(no-icon))?\s*$/.test(l),
        (l) => /^:::\s*$/.test(l),
      );
      i = next;
      const noIconClass = noIcon ? ' no-icon' : '';
      output.push('');
      output.push(`<div class="note-block note-${style}${noIconClass}">`);
      output.push('');
      output.push(processBlocks(inner.join('\n'), opts, depth + 1));
      output.push('');
      output.push('</div>');
      output.push('');
      continue;
    }

    // +++style Title ... +++
    const collapseMatch = containers && line.match(/^\+\+\+(\w+)\s+(.+)$/);
    if (collapseMatch) {
      flushTabs();
      const style = collapseMatch[1];
      const title = collapseMatch[2];
      const { inner, next } = collectBlock(
        lines,
        i + 1,
        (l) => /^\+\+\+\w+\s+.+$/.test(l),
        (l) => /^\+\+\+\s*$/.test(l),
      );
      i = next;
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
      continue;
    }

    // ;;;groupId TabName ... ;;;
    const tabMatch = containers && line.match(/^;;;(\S+)\s+(.+)$/);
    if (tabMatch) {
      const tabId = tabMatch[1];
      const tabName = tabMatch[2];
      const { inner, next } = collectBlock(
        lines,
        i + 1,
        (l) => /^;;;\S+\s+.+$/.test(l),
        (l) => /^;;;\s*$/.test(l),
      );
      i = next;
      if (pendingTabId === tabId) {
        pendingTabs.push({ name: tabName, lines: inner });
      } else {
        flushTabs();
        pendingTabId = tabId;
        pendingTabs = [{ name: tabName, lines: inner }];
      }
      continue;
    }

    // {% links %} ... {% endlinks %}
    if (hexoTags && line.trim() === '{% links %}') {
      flushTabs();
      const yamlLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '{% endlinks %}') {
        yamlLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      try {
        const data = parseYaml(yamlLines.join('\n')) as FriendLinkData[];
        if (Array.isArray(data)) {
          output.push('');
          output.push(renderFriendLinks(data));
          output.push('');
        }
      } catch {
        output.push('<!-- links YAML の解析に失敗しました -->');
      }
      continue;
    }

    // {% media audio|video %} ... {% endmedia %}
    const mediaMatch = hexoTags && line.trim().match(/^{% media (audio|video) %}$/);
    if (mediaMatch) {
      flushTabs();
      const mediaType = mediaMatch[1];
      const yamlLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '{% endmedia %}') {
        yamlLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      try {
        const data = parseYaml(yamlLines.join('\n')) as MediaItem[];
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
  return parts.length > 0 ? parts.join('') : fn(text);
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
