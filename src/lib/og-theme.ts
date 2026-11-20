/**
 * OGP 画像の配色をサイトのテーマ (src/styles/global.css の --hishaku-*) から取る (純粋関数)。
 *
 * 画像は 1 枚しか作れないため、ダークテーマ (.dark) の色を使う。
 * .dark に無い変数は :root (ライトテーマ) の値で補う。
 * ファイルの読み込みは src/lib/og-image.ts が担当する。
 */

export interface OgThemeColors {
  bg: string;
  surface: string;
  border: string;
  fg: string;
  fgMuted: string;
  accent: string;
}

type Rgb = [number, number, number];

const THEME_VARS: Record<keyof OgThemeColors, string> = {
  bg: '--hishaku-bg',
  surface: '--hishaku-surface',
  border: '--hishaku-border',
  fg: '--hishaku-fg',
  fgMuted: '--hishaku-fg-muted',
  accent: '--hishaku-accent',
};

function hslToRgb(h: number, s: number, l: number): Rgb {
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [channel(0), channel(8), channel(4)];
}

/** `hsl(216 3.6% 85%)` / `hsl(216, 3.6%, 85%)` / `#rrggbb` / `#rgb` を RGB にする (読めなければ undefined) */
export function parseColor(value: string): Rgb | undefined {
  const color = value.trim();
  const hsl = color.match(/^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/i);
  if (hsl) return hslToRgb(Number(hsl[1]), Number(hsl[2]) / 100, Number(hsl[3]) / 100);
  const hex = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (!hex) return undefined;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as Rgb;
}

export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** 2 色を混ぜる (ratio は color の割合。CSS の color-mix と同じ考え方) */
export function mixColors(color: string, base: string, ratio: number): string {
  const a = parseColor(color);
  const b = parseColor(base);
  if (!a || !b) return color;
  return toHex(a.map((c, i) => Math.round(c * ratio + b[i] * (1 - ratio))) as Rgb);
}

function readBlock(css: string, selector: RegExp, colors: OgThemeColors): void {
  const block = css.match(selector)?.[1] ?? '';
  for (const [key, name] of Object.entries(THEME_VARS) as [keyof OgThemeColors, string][]) {
    const value = block.match(new RegExp(`${name}\\s*:\\s*([^;]+);`))?.[1];
    const rgb = value ? parseColor(value) : undefined;
    if (rgb) colors[key] = toHex(rgb);
  }
}

/**
 * CSS の最初の `.dark { ... }` から --hishaku-* の色を読む。
 * .dark に無い変数は最初の `:root { ... }`、それにも無い・読めない変数は fallback の値を使う。
 */
export function parseThemeColors(css: string, fallback: OgThemeColors): OgThemeColors {
  const colors = { ...fallback };
  readBlock(css, /:root\s*\{([^}]*)\}/, colors);
  readBlock(css, /\.dark\s*\{([^}]*)\}/, colors);
  return colors;
}
