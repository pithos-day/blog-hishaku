/** テーマ名を保存する localStorage のキー (初期化スクリプトとも共有する) */
export const THEME_STORAGE_KEY = 'theme';

/** テーマトグル (ライト / ダーク切替) の初期化 */
export const initThemeToggle = (): void => {
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle?.addEventListener('click', () => {
    const root = document.documentElement;
    // トグル後のテーマ値を先に決め、class / data-theme / 保存の3箇所で同じ値を使う
    const theme = root.classList.contains('dark') ? 'light' : 'dark';
    root.classList.toggle('dark');
    root.dataset.theme = theme;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // localStorage が使えない環境ではセッション内のみ反映
    }
  });
};
