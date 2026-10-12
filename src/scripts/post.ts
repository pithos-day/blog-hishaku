/**
 * 記事ページ (post/[...slug]) の表示強化。
 * 外部リンクの新規タブ、見出しレベル表示、スムーズスクロール、
 * タブ / スポイザー / コードブロック操作など。
 * 各強化は関数 1 つに分かれており、initPostEnhancements が順に呼ぶ。
 */
import { t } from '@/i18n';
import { siteConfig } from '@/lib/config';

/** 外部リンクを新規タブで開く */
const setupExternalLinks = (): void => {
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>('.prose a[href]')) {
    const href = anchor.getAttribute('href') ?? '';
    if (/^(https?:)?\/\//.test(href)) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
  }
};

/** 見出しにレベル表示用の data-level を付与 */
const setupHeadingLevels = (): void => {
  for (const heading of document.querySelectorAll('h1, h2, h3, h4, h5, h6')) {
    heading.setAttribute('data-level', `H${heading.tagName[1]}`);
  }
};

/** 見出しアンカーのスムーススクロール */
const setupSmoothScroll = (): void => {
  for (const anchor of document.querySelectorAll<HTMLAnchorElement>(
    'a.anchor-link[href^="#"], .post-toc a[href^="#"]',
  )) {
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      const target = document.getElementById(decodeURIComponent(anchor.hash.slice(1)));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        history.pushState(null, '', anchor.hash);
      }
    });
  }
};

/** ;;; タブの切替 */
const setupTabs = (): void => {
  for (const group of document.querySelectorAll('.tab-group')) {
    const headers = group.querySelectorAll<HTMLButtonElement>('.tab-header');
    const panels = group.querySelectorAll<HTMLElement>('.tab-panel');
    headers.forEach((header, index) => {
      header.addEventListener('click', () => {
        headers.forEach((item, i) => {
          const active = i === index;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', String(active));
        });
        panels.forEach((panel, i) => {
          panel.classList.toggle('active', i === index);
        });
      });
    });
  }
};

/** スポイザーのクリックで表示切替 */
const setupSpoilers = (): void => {
  for (const spoiler of document.querySelectorAll('.spoiler')) {
    spoiler.addEventListener('click', () => spoiler.classList.toggle('revealed'));
  }
};

/** コードブロック強化: 折りたたみ・コピー・全画面 */
const setupCodeBlocks = (): void => {
  for (const frame of document.querySelectorAll<HTMLElement>('.code-frame')) {
    const code = frame.querySelector('code');
    if (!code) continue;

    const setFolded = (folded: boolean) => {
      frame.classList.toggle('code-frame--folded', folded);
      const toggle = frame.querySelector<HTMLButtonElement>('.frame-btn-fold');
      if (toggle) {
        const label = folded ? t('code.expand') : t('code.collapse');
        toggle.setAttribute('aria-label', label);
        toggle.title = label;
        toggle.setAttribute('aria-expanded', String(!folded));
      }
    };

    frame.querySelector('.frame-btn-fold')?.addEventListener('click', () => {
      setFolded(!frame.classList.contains('code-frame--folded'));
    });
    frame.querySelector('.fold-overlay')?.addEventListener('click', () => setFolded(false));

    const copyButton = frame.querySelector<HTMLButtonElement>('.frame-btn-copy');
    if (copyButton) {
      let resetTimer: ReturnType<typeof setTimeout> | undefined;
      copyButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(code.textContent ?? '');
        } catch {
          return; // クリップボードが使えない環境
        }
        copyButton.classList.add('is-copied');
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          copyButton.classList.remove('is-copied');
        }, 2000);
      });
    }

    frame.querySelector('.frame-btn-full')?.addEventListener('click', () => {
      if (document.fullscreenElement) {
        void document.exitFullscreen();
      } else {
        void frame.requestFullscreen();
      }
    });
  }
};

export const initPostEnhancements = (): void => {
  // 呼び出し元 (astro.config.mjs) と同じ content という名前で参照する
  const content = siteConfig.content;

  if (content.addBlankTarget) setupExternalLinks();
  if (content.addHeadingLevel) setupHeadingLevels();
  if (content.smoothScroll) setupSmoothScroll();
  setupTabs();
  setupSpoilers();
  if (content.enhanceCodeBlock) setupCodeBlocks();
};
