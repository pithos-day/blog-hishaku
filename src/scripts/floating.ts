/** フローティングツールバー (右下): 展開切替とページ内スクロール */
export const initFloatingActions = (): void => {
  const floatingGroup = document.getElementById('floating-group');
  const floatingToggle = document.getElementById('floating-toggle');
  if (!floatingGroup || !floatingToggle) return;

  floatingToggle.addEventListener('click', () => {
    const expanded = floatingGroup.dataset.expanded !== 'true';
    floatingGroup.dataset.expanded = String(expanded);
    floatingToggle.setAttribute('aria-expanded', String(expanded));
  });
  const scrollBehavior = (): ScrollBehavior =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  document.getElementById('floating-top')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  });
  document.getElementById('floating-bottom')?.addEventListener('click', () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: scrollBehavior() });
  });
};
