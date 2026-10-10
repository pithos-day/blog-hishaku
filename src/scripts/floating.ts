/** フローティングツールバー (右下): 展開切替とページ内スクロール */

/** カスタムスクロールの所要時間 (ms) — ネイティブ smooth より高速 */
const SCROLL_DURATION = 250;

/** easeOutQuart: 初速が速く末尾で減速するイージング */
function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4;
}

/** リクエストアニメーションフレームで高速スクロールする */
function scrollToY(targetY: number): void {
  const startY = window.scrollY;
  const distance = targetY - startY;
  if (distance === 0) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    window.scrollTo({ top: targetY, behavior: 'instant' });
    return;
  }

  const startTime = performance.now();
  const step = (now: number): void => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / SCROLL_DURATION, 1);
    window.scrollTo(0, startY + distance * easeOutQuart(progress));
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

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
  document.getElementById('floating-top')?.addEventListener('click', () => {
    scrollToY(0);
  });
  document.getElementById('floating-bottom')?.addEventListener('click', () => {
    scrollToY(document.documentElement.scrollHeight);
  });
};
