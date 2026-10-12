/**
 * インライン属性構文 `{.class #id key=value}` の共通トークン処理。
 *
 * remark 側 (remark-effects / remark-spoiler) と rehype 側 (rehype-attrs) が
 * 同じ正規表現を重複して持たないように、単一の定義をここに置く。
 */

/** 属性トークンに使える CSS 識別子 */
export const CSS_IDENT = /^[a-zA-Z_-][a-zA-Z0-9_-]*$/;

/** テキスト末尾に続く `{...}` 属性ブロック */
export const TRAILING_ATTR_PATTERN = /^\{([^}]+)\}/;

export interface AttrTokens {
  /** `.name` から取り出したクラス名 (CSS 識別子として妥当なものだけ) */
  classes: string[];
  /** `#id` (なければ null) */
  id: string | null;
  /** `key=value` の対 (キーが CSS 識別子として妥当なものだけ)。値は未エスケープ */
  attrs: { key: string; value: string }[];
}

/** `{.class #id key=value}` の中身を空白区切りのトークンへ分解する */
export function parseAttrTokens(raw: string): AttrTokens {
  const tokens: AttrTokens = { classes: [], id: null, attrs: [] };
  for (const token of raw.split(/\s+/)) {
    if (token.startsWith('.')) {
      const className = token.slice(1);
      if (CSS_IDENT.test(className)) {
        tokens.classes.push(className);
      }
    } else if (token.startsWith('#')) {
      const id = token.slice(1);
      if (CSS_IDENT.test(id)) {
        tokens.id = id;
      }
    } else if (token.includes('=')) {
      const [key, ...rest] = token.split('=');
      if (CSS_IDENT.test(key)) {
        tokens.attrs.push({ key, value: rest.join('=') });
      }
    }
  }
  return tokens;
}
