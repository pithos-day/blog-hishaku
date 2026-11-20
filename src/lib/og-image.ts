/**
 * カバー未指定の記事向け OGP 画像 (1200×630 PNG) を @vercel/og で描画する。
 *
 * 配色はサイトのダークテーマ (src/styles/global.css の .dark の --hishaku-*) から取る。
 * フォントは同梱の Gen Interface JP (public/fonts/gen-interface-jp) を使う。
 * satori は woff2 を読めないため、描画する文字を含むサブセットだけを TTF に展開して渡す。
 * React は使わず、satori が受け付ける { type, props } の要素をそのまま組み立てる。
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from '@vercel/og';
import decompressWoff2 from 'wawoff2/decompress.js';
import { type FontFaceSubset, parseFontFaces, pickSubsetsForText, stripEmoji } from './og-font';
import { mixColors, type OgThemeColors, parseThemeColors } from './og-theme';

const WIDTH = 1200;
const HEIGHT = 630;
const FONT_FAMILY = 'Gen Interface JP';
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts', 'gen-interface-jp');
const THEME_CSS = path.join(process.cwd(), 'src', 'styles', 'global.css');
/** タイトル・サイト名 (同梱は 400/500/600 のみ) */
const HEADING_WEIGHT = 500;
const TEXT_WEIGHT = 400;

// global.css を読めない、または変数が見つからないときの色 (ダークテーマの値を 16 進にしたもの)
const FALLBACK_COLORS: OgThemeColors = {
  bg: '#21252b',
  surface: '#31373f',
  border: '#4e5765',
  fg: '#f2f2f2',
  fgMuted: '#a1a1a1',
  accent: '#78bced',
};

export interface OgImageInput {
  title: string;
  /** 左下のラベルに表示するカテゴリ */
  category?: string;
  /** ラベルの右に `#tag` で並べる */
  tags?: string[];
  /** 右下に表示する日付 (整形済み) */
  date: string;
  siteTitle: string;
  /** public/ からのパス。svg / png / jpeg のみ描画する (それ以外や外部 URL はアクセント色の丸) */
  avatar?: string;
}

/** ImageResponse が受け取る要素 (型は React の ReactElement だが、satori は { type, props } で足りる) */
type OgElement = ConstructorParameters<typeof ImageResponse>[0];

interface SatoriNode {
  type: string;
  props: Record<string, unknown> & { style?: Record<string, unknown>; children?: unknown };
}

function h(
  type: string,
  style: Record<string, unknown>,
  children?: unknown,
  props = {},
): SatoriNode {
  return { type, props: { ...props, style, children } };
}

let fontFacesPromise: Promise<FontFaceSubset[]> | undefined;
const fontDataCache = new Map<string, Promise<ArrayBuffer>>();

function loadFontFaces(): Promise<FontFaceSubset[]> {
  fontFacesPromise ??= fs
    .readFile(path.join(FONT_DIR, 'gen-interface-jp.css'), 'utf8')
    .then(parseFontFaces);
  return fontFacesPromise;
}

/** サブセットの woff2 を TTF に展開する (同じファイルは記事をまたいで使い回す) */
function loadFontData(src: string): Promise<ArrayBuffer> {
  let cached = fontDataCache.get(src);
  if (!cached) {
    cached = fs.readFile(path.join(FONT_DIR, src)).then(async (woff2) => {
      const ttf = await decompressWoff2(woff2);
      return ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength) as ArrayBuffer;
    });
    fontDataCache.set(src, cached);
  }
  return cached;
}

/**
 * satori は 1 つのフォント名につき 1 ファイルしか使わないため、サブセットごとに
 * 名前を分けて登録し、fontFamily にその一覧を並べる (ウェイト違いは同じ名前で持つ)。
 */
async function loadFonts(texts: { weight: number; text: string }[]) {
  const faces = await loadFontFaces();
  const fonts = await Promise.all(
    texts.flatMap(({ weight, text }) =>
      pickSubsetsForText(faces, weight, text).map(async (face) => ({
        name: `${FONT_FAMILY} ${path.basename(face.src, '.woff2')}`,
        data: await loadFontData(face.src),
        weight: weight as 400 | 500,
        style: 'normal' as const,
      })),
    ),
  );
  const families = [...new Set(fonts.map((font) => JSON.stringify(font.name)))];
  return { fonts, fontFamily: families.join(', ') };
}

const AVATAR_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

async function loadAvatarDataUri(avatar: string | undefined): Promise<string | undefined> {
  if (!avatar?.startsWith('/')) return undefined;
  const mime = AVATAR_TYPES[path.extname(avatar).toLowerCase()];
  if (!mime) return undefined;
  try {
    const data = await fs.readFile(path.join(process.cwd(), 'public', avatar));
    return `data:${mime};base64,${data.toString('base64')}`;
  } catch {
    return undefined;
  }
}

let themePromise: Promise<OgThemeColors> | undefined;

/** サイトのダークテーマ (global.css の .dark) から配色を読む */
function loadTheme(): Promise<OgThemeColors> {
  themePromise ??= fs
    .readFile(THEME_CSS, 'utf8')
    .then((css) => parseThemeColors(css, FALLBACK_COLORS))
    .catch(() => FALLBACK_COLORS);
  return themePromise;
}

function formatTags(tags: readonly string[] | undefined): string {
  return (tags ?? []).map((tag) => `#${tag}`).join(' ');
}

/**
 * デザイン案 A (表示幅 358px のモックアップ) の寸法を 1200px 幅へ拡大する倍率。
 * 下の数値はモックアップの px 値そのままで、px() で拡大して使う
 */
const SCALE = WIDTH / 358;
const px = (value: number) => value * SCALE;

/** 上段 アイコン・サイト名 / 中段 タイトル / 下段 カテゴリ・タグ・日付 (デザイン案 A) */
function buildTree(
  input: OgImageInput,
  avatarSrc: string | undefined,
  fontFamily: string,
  colors: OgThemeColors,
): SatoriNode {
  const iconSize = px(22);
  const icon = avatarSrc
    ? h(
        'img',
        { width: iconSize, height: iconSize, borderRadius: 9999, flexShrink: 0 },
        undefined,
        {
          src: avatarSrc,
          width: iconSize,
          height: iconSize,
        },
      )
    : h('div', {
        width: iconSize,
        height: iconSize,
        borderRadius: 9999,
        flexShrink: 0,
        backgroundColor: colors.accent,
      });

  const header = h('div', { display: 'flex', alignItems: 'center', gap: px(8) }, [
    icon,
    h('div', { fontSize: px(12), fontWeight: HEADING_WEIGHT, color: colors.fg }, input.siteTitle),
  ]);

  const title = h(
    'div',
    {
      display: 'block',
      fontSize: px(19),
      fontWeight: HEADING_WEIGHT,
      lineHeight: 1.4,
      color: colors.fg,
      // モックアップに無い指定。長いタイトルが下段に重ならないよう 3 行で切る
      lineClamp: 3,
      textOverflow: 'ellipsis',
    },
    input.title,
  );

  const footer = h(
    'div',
    {
      display: 'flex',
      alignItems: 'center',
      gap: px(8),
      fontSize: px(11),
      color: colors.fgMuted,
    },
    [
      input.category &&
        h(
          'div',
          {
            flexShrink: 0,
            padding: `${px(2)}px ${px(8)}px`,
            borderRadius: px(4),
            // アクセント色を地の色へ薄く混ぜたラベル
            backgroundColor: mixColors(colors.accent, colors.surface, 0.12),
            color: colors.accent,
          },
          input.category,
        ),
      // モックアップに無い指定。タグが多いときに日付を押し出さないよう 1 行で切る
      h(
        'div',
        { display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
        formatTags(input.tags),
      ),
      h('div', { flexShrink: 0, marginLeft: 'auto' }, input.date),
    ].filter(Boolean),
  );

  return h(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: `${px(18)}px ${px(22)}px`,
      backgroundColor: colors.surface,
      fontFamily,
    },
    [header, title, footer],
  );
}

/** OGP 画像を PNG のバイト列で返す */
export async function renderOgImage(rawInput: OgImageInput): Promise<ArrayBuffer> {
  const input: OgImageInput = {
    ...rawInput,
    title: stripEmoji(rawInput.title),
    category: rawInput.category && stripEmoji(rawInput.category),
    tags: rawInput.tags?.map(stripEmoji).filter(Boolean),
    siteTitle: stripEmoji(rawInput.siteTitle),
  };
  const [{ fonts, fontFamily }, avatarSrc, colors] = await Promise.all([
    loadFonts([
      // … は 3 行を超えたタイトル・はみ出したタグの省略記号
      { weight: HEADING_WEIGHT, text: `${input.title}${input.siteTitle}…` },
      {
        weight: TEXT_WEIGHT,
        text: `${input.category ?? ''}${formatTags(input.tags)}${input.date}…`,
      },
    ]),
    loadAvatarDataUri(input.avatar),
    loadTheme(),
  ]);
  // ImageResponse は描画をストリームの読み出しまで遅らせるため、ここで読み切って失敗をこの場で投げる
  const response = new ImageResponse(
    buildTree(input, avatarSrc, fontFamily, colors) as unknown as OgElement,
    { width: WIDTH, height: HEIGHT, fonts },
  );
  return response.arrayBuffer();
}
