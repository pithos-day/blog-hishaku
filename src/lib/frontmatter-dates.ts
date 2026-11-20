/**
 * frontmatter の日付を、YAML が Date に変換する前の文字列のまま取り出す。
 *
 * Astro の frontmatter パーサ (js-yaml) は引用符なしのタイムスタンプを Date に変換する。
 * このとき `2026-10-01 09:30:00` (オフセットなし) は UTC として、
 * `2026-10-01T09:30:00+09:00` (オフセット付き) は正しい絶対時刻として解釈され、
 * 結果の Date からはどちらだったかを区別できない。
 * そのため元の文字列を読み直し、parsePostDate の文字列の経路で解釈させる。
 */
import { parse as parseYaml } from 'yaml';

/** 元の文字列を読み直す frontmatter のキー */
const DATE_FIELDS = ['date', 'updated'] as const;

type DateField = (typeof DATE_FIELDS)[number];

const FRONTMATTER_PATTERN = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

/**
 * Markdown ファイルの中身から date / updated の元の文字列を取り出す。
 * yaml パッケージ (YAML 1.2 core スキーマ) はタイムスタンプを文字列のまま返す。
 * frontmatter が無い・解析できない・値が文字列でないキーは含めない。
 */
export function readRawDateFields(source: string): Partial<Record<DateField, string>> {
  const match = FRONTMATTER_PATTERN.exec(source);
  if (!match) return {};

  let doc: unknown;
  try {
    doc = parseYaml(match[1]);
  } catch {
    // Astro 側の解析エラーとして報告されるので、ここでは何もしない
    return {};
  }
  if (doc === null || typeof doc !== 'object') return {};

  const result: Partial<Record<DateField, string>> = {};
  for (const field of DATE_FIELDS) {
    const value = (doc as Record<string, unknown>)[field];
    if (typeof value === 'string') result[field] = value;
  }
  return result;
}
