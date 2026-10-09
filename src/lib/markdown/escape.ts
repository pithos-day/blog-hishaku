/** HTML エスケープ (シェーダやプレースホルダ向けの最小ユーティリティ) */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** CSS カラー値のサニタイズ (hex / named / rgb / hsl のみ許可) */
export function sanitizeCssColor(color: string): string | null {
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return trimmed;
  if (/^(rgb|hsl)a?\([\d\s,%./]+\)$/.test(trimmed)) return trimmed;
  if (/^[a-zA-Z]+$/.test(trimmed)) return trimmed;
  return null;
}
