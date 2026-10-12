/**
 * 検索ダイアログ (Pagefind) の初期化。
 * BaseLayout からページ読み込み時に 1 度だけ呼ばれる。
 */
import { t } from '@/i18n';

interface PagefindSearchResult {
  data(): Promise<{ url: string; meta: { title?: string }; excerpt: string }>;
}
interface PagefindApi {
  init(): Promise<void>;
  search(query: string): Promise<{ results: PagefindSearchResult[] }>;
}

const dialog = document.getElementById('search-dialog');
const closeButton = document.getElementById('search-close');
const input = document.getElementById('search-input');
const resultsBox = document.getElementById('search-results');

// 検索ダイアログの初期化 (必要な要素が揃わないページでは何もしない)
export const initSearch = (): void => {
  if (!(dialog instanceof HTMLDialogElement)) return;
  if (!closeButton || !(input instanceof HTMLInputElement) || !resultsBox) return;

  let pagefindPromise: Promise<PagefindApi | null> | undefined;

  const loadPagefind = (): Promise<PagefindApi | null> => {
    if (!pagefindPromise) {
      const baseUrl = import.meta.env.BASE_URL;
      pagefindPromise = import(/* @vite-ignore */ `${baseUrl}pagefind/pagefind.js`)
        .then(async (module) => {
          const pagefind = module as unknown as PagefindApi;
          await pagefind.init();
          return pagefind;
        })
        .catch(() => null);
    }
    return pagefindPromise;
  };

  const runSearch = async (): Promise<void> => {
    const query = input.value.trim();
    resultsBox.replaceChildren();
    if (!query) return;
    const pagefind = await loadPagefind();
    if (!pagefind) {
      resultsBox.textContent = t('search.noIndex');
      return;
    }
    const found = await pagefind.search(query);
    const entries = await Promise.all(found.results.slice(0, 10).map((result) => result.data()));
    if (entries.length === 0) {
      resultsBox.textContent = t('search.noResults');
      return;
    }
    for (const entry of entries) {
      const link = document.createElement('a');
      link.href = entry.url;
      link.className = 'block rounded border border-border px-3 py-2 hover:border-accent';
      const title = document.createElement('div');
      title.className = 'font-medium';
      title.textContent = entry.meta.title ?? entry.url;
      const excerpt = document.createElement('div');
      excerpt.className = 'text-sm text-fg-muted';
      // excerpt は Pagefind がビルド時にインデックスした自サイト HTML に
      // ヒット語の <mark> を付けただけの文字列。外部入力を混ぜないため
      // innerHTML でも XSS 面は閉じている。
      excerpt.innerHTML = entry.excerpt;
      link.append(title, excerpt);
      resultsBox.append(link);
    }
  };

  const openDialog = (): void => {
    if (!dialog.open) dialog.showModal();
    void loadPagefind();
    input.focus();
  };

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  closeButton.addEventListener('click', () => dialog.close());
  // バックドロップ (ウインドウ外側) をクリックしたら閉じる
  dialog.addEventListener('click', (event) => {
    const rect = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });
  input.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => void runSearch(), 150);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void runSearch();
    }
  });

  const sidebarForm = document.getElementById('sidebar-search');
  sidebarForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const sidebarInput = sidebarForm.querySelector('input[name="q"]');
    input.value = sidebarInput instanceof HTMLInputElement ? sidebarInput.value : '';
    openDialog();
    void runSearch();
  });
};
