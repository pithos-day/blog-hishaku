/** テーマトグル (ライト / ダーク切替) の初期化 */
export const initThemeToggle = (): void => {
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle?.addEventListener('click', () => {
    const root = document.documentElement;
    const next = root.classList.contains('dark') ? 'light' : 'dark';
    root.classList.toggle('dark', next === 'dark');
    root.dataset.theme = next;
    try {
      window.localStorage.setItem('theme', next);
    } catch {
      // localStorage が使えない環境ではセッション内のみ反映
    }
  });
};
