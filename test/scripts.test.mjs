/**
 * src/scripts/* の単体テスト。
 *
 * 初期化関数はブラウザ依存なので document / window をスタブして振る舞いを固定する。
 * siteConfig のフラグで分岐する処理は config/site.yaml の既定
 * (addBlankTarget / addHeadingLevel = true) を前提とし、無効化済みならスキップする。
 */
import assert from 'node:assert/strict';
import test, { beforeEach } from 'node:test';
import { siteConfig } from '../src/lib/config';

// ---- 最小 DOM スタブ -------------------------------------------------------------

/** イベント登録・属性・クラスを模した汎用要素 */
function makeElement(initial = {}) {
  const listeners = new Map();
  const classes = new Set(initial.classes ?? []);
  const attributes = new Map(Object.entries(initial.attributes ?? {}));
  const element = {
    style: {},
    dataset: {},
    tagName: initial.tagName,
    alt: initial.alt ?? '',
    complete: initial.complete ?? false,
    naturalWidth: initial.naturalWidth ?? 0,
    naturalHeight: initial.naturalHeight ?? 0,
    classList: {
      contains: (name) => classes.has(name),
      add: (name) => classes.add(name),
      toggle: (name, force) => {
        const next = force ?? !classes.has(name);
        if (next) classes.add(name);
        else classes.delete(name);
        return next;
      },
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    /** 登録済みハンドラを同期的に呼ぶ (event で target クライアント座標を上書き可) */
    dispatch(type, event = {}) {
      for (const handler of listeners.get(type) ?? []) {
        handler({ type, target: element, ...event });
      }
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    closest(selector) {
      return initial.closest?.(selector) ?? null;
    },
    querySelectorAll(selector) {
      return initial.queries?.[selector] ?? [];
    },
    getBoundingClientRect: () => initial.rect ?? { left: 0, top: 0, width: 100, height: 100 },
  };
  if (initial.attributes) {
    for (const [name, value] of Object.entries(initial.attributes)) element[name] = value;
  }
  return element;
}

const registry = new Map();
const queries = new Map();
let documentElement;
let body;
const storage = new Map();
let storageThrows = false;
const scrollCalls = [];
let scrollY = 0;

globalThis.document = {
  getElementById: (id) => registry.get(id) ?? null,
  querySelectorAll: (selector) => queries.get(selector) ?? [],
  get documentElement() {
    return documentElement;
  },
  get body() {
    return body;
  },
};

globalThis.window = {
  get localStorage() {
    if (storageThrows) throw new Error('SecurityError: localStorage is unavailable');
    return { setItem: (key, value) => storage.set(key, String(value)) };
  },
  matchMedia: () => ({ matches: true }), // prefers-reduced-motion: reduce を想定
  scrollTo: (...args) => scrollCalls.push(args),
  get scrollY() {
    return scrollY;
  },
};

// `instanceof` で要素の種類を判定するモジュールのために型の名前だけ Node へ持たせる
globalThis.HTMLDialogElement ??= class HTMLDialogElement {};
globalThis.HTMLInputElement ??= class HTMLInputElement {};
// Node は DOM 専用のグローバル。テキストノード判定だけを再現する。
globalThis.Node ??= { TEXT_NODE: 3 };

beforeEach(() => {
  registry.clear();
  queries.clear();
  documentElement = makeElement();
  body = { style: {} };
  storage.clear();
  storageThrows = false;
  scrollCalls.length = 0;
  scrollY = 0;
});

// ---- theme.ts --------------------------------------------------------------------

test('initThemeToggle: クリックで dark をトグルし localStorage に保存', async () => {
  const { initThemeToggle, THEME_STORAGE_KEY } = await import('../src/scripts/theme.ts');
  const button = makeElement();
  registry.set('theme-toggle', button);
  initThemeToggle();

  button.dispatch('click');
  assert.equal(documentElement.classList.contains('dark'), true, '1回目でダークに');
  assert.equal(documentElement.dataset.theme, 'dark');
  assert.equal(storage.get(THEME_STORAGE_KEY), 'dark', '次回読み込み用に保存');

  button.dispatch('click');
  assert.equal(documentElement.classList.contains('dark'), false, '2回目でライトに');
  assert.equal(storage.get(THEME_STORAGE_KEY), 'light');
});

test('initThemeToggle: localStorage が使えない環境でも切り替えは継続する', async () => {
  const { initThemeToggle } = await import('../src/scripts/theme.ts');
  const button = makeElement();
  registry.set('theme-toggle', button);
  storageThrows = true;
  initThemeToggle();

  assert.doesNotThrow(() => button.dispatch('click'), '保存失敗でクリックが壊れない');
  assert.equal(documentElement.classList.contains('dark'), true, 'クラス切替は反映済み');
});

// ---- post.ts ---------------------------------------------------------------------

test('initPostEnhancements: 外部リンクだけ target=_blank と rel を付与', async (t) => {
  if (!siteConfig.content.addBlankTarget) return t.skip('addBlankTarget が無効');
  const { initPostEnhancements } = await import('../src/scripts/post.ts');

  const external = makeElement({ attributes: { href: 'https://example.com/a' } });
  const protocolRelative = makeElement({ attributes: { href: '//example.com/b' } });
  const internal = makeElement({ attributes: { href: '/about/' } });
  queries.set('.prose a[href]', [external, protocolRelative, internal]);

  initPostEnhancements();

  for (const anchor of [external, protocolRelative]) {
    assert.equal(anchor.target, '_blank');
    assert.equal(anchor.rel, 'noopener noreferrer');
  }
  assert.equal(internal.target, undefined, '内部リンクには触れない');
});

test('initPostEnhancements: 見出しへ data-level を付与', async (t) => {
  if (!siteConfig.content.addHeadingLevel) return t.skip('addHeadingLevel が無効');
  const { initPostEnhancements } = await import('../src/scripts/post.ts');

  const h1 = makeElement({ tagName: 'H1' });
  const h3 = makeElement({ tagName: 'H3' });
  queries.set('h1, h2, h3, h4, h5, h6', [h1, h3]);

  initPostEnhancements();

  assert.equal(h1.getAttribute('data-level'), 'H1');
  assert.equal(h3.getAttribute('data-level'), 'H3');
});

test('initPostEnhancements: スポイザーはクリックで revealed をトグル', async () => {
  const { initPostEnhancements } = await import('../src/scripts/post.ts');
  const spoiler = makeElement();
  queries.set('.spoiler', [spoiler]);

  initPostEnhancements();

  spoiler.dispatch('click');
  assert.equal(spoiler.classList.contains('revealed'), true);
  spoiler.dispatch('click');
  assert.equal(spoiler.classList.contains('revealed'), false);
});

test('initPostEnhancements: タブ切替で active と aria-selected が移る', async () => {
  const { initPostEnhancements } = await import('../src/scripts/post.ts');

  const headers = [makeElement(), makeElement(), makeElement()];
  const panels = [makeElement(), makeElement(), makeElement()];
  const group = makeElement({
    queries: { '.tab-header': headers, '.tab-panel': panels },
  });
  queries.set('.tab-group', [group]);

  initPostEnhancements();

  headers[2].dispatch('click');
  assert.deepEqual(
    headers.map((header) => header.classList.contains('active')),
    [false, false, true],
    '選択タブだけ active',
  );
  assert.equal(headers[2].getAttribute('aria-selected'), 'true');
  assert.equal(headers[0].getAttribute('aria-selected'), 'false');
  assert.deepEqual(
    panels.map((panel) => panel.classList.contains('active')),
    [false, false, true],
    'パネルも追随',
  );
});

// ---- image-enhancer.ts -----------------------------------------------------------

test('isNarrowImage: 縦長または正方形の画像を横並び対象と判定', async () => {
  const { isNarrowImage } = await import('../src/scripts/image-enhancer.ts');

  assert.equal(isNarrowImage(1080, 1920), true, '9:16 は対象');
  assert.equal(isNarrowImage(640, 960), true, '2:3 は対象');
  assert.equal(isNarrowImage(1000, 1000), true, '1:1 は対象');
  assert.equal(isNarrowImage(1920, 1080), false, '16:9 は対象外');
  assert.equal(isNarrowImage(1000, 999), false, 'わずかに横長なら対象外');
  assert.equal(isNarrowImage(0, 0), false, '読み込み前は判定しない');
});

test('groupNarrowImages: 連続する正方形画像を1行にまとめる', async () => {
  const { groupNarrowImages } = await import('../src/scripts/image-enhancer.ts');

  const first = makeElement({ classes: ['markdown-image-wrapper', 'is-narrow'] });
  const second = makeElement({ classes: ['markdown-image-wrapper', 'is-narrow'] });
  first.dataset.aspectRatio = '1';
  second.dataset.aspectRatio = '1';

  // 段落間の改行 (空白テキスト) を挟んでも隣接扱いになることを確認する
  first.nextSibling = { nodeType: Node.TEXT_NODE, textContent: '\n', nextSibling: second };

  const container = makeElement({
    queries: {
      '.markdown-image-strip': [],
      '.markdown-image-wrapper': [first, second],
    },
  });

  let strip = null;
  first.before = (node) => {
    strip = node;
  };

  const createElement = document.createElement;
  const createDocumentFragment = document.createDocumentFragment;
  document.createElement = () => {
    const element = { className: '', children: [] };
    element.appendChild = (node) => {
      element.children.push(...(node.children ?? [node]));
    };
    return element;
  };
  document.createDocumentFragment = () => {
    const fragment = { children: [] };
    fragment.appendChild = (node) => fragment.children.push(node);
    return fragment;
  };

  try {
    groupNarrowImages(container);
  } finally {
    document.createElement = createElement;
    document.createDocumentFragment = createDocumentFragment;
  }

  assert.equal(strip?.className, 'markdown-image-strip');
  assert.deepEqual(strip?.children, [first, second], '元の順序で1行にまとめる');
  assert.equal(first.style.flex, '1 1 0%', '縦横比を flex-grow に使う');
  assert.equal(second.style.flex, '1 1 0%');
});

// ---- lightbox.ts -----------------------------------------------------------------

/** ダイアログを持つライトボックスの部品一式を用意する */
function setupLightbox() {
  const dialog = makeElement();
  const img = makeElement({ attributes: { src: '' } });
  const closeButton = makeElement();
  dialog.showModal = () => {
    dialog.open = true;
  };
  dialog.close = () => {
    dialog.open = false;
    dialog.dispatch('close');
  };
  registry.set('lightbox-dialog', dialog);
  registry.set('lightbox-img', img);
  registry.set('lightbox-close', closeButton);
  return { dialog, img, closeButton };
}

test('initLightbox: 本文画像のクリックで開き閉じるボタンで閉じる', async () => {
  const { initLightbox } = await import('../src/scripts/lightbox.ts');
  const { dialog, img, closeButton } = setupLightbox();

  const image = makeElement({
    attributes: { src: '/img/a.png' },
    closest: () => null, // リンク内ではない
  });
  image.alt = '写真';
  queries.set('article img[src]', [image]);

  initLightbox();

  assert.equal(image.style.cursor, 'zoom-in', '拡大できる旨を示す');
  image.dispatch('click');
  assert.equal(img.src, '/img/a.png', 'クリックした画像を表示');
  assert.equal(img.alt, '写真');
  assert.equal(dialog.open, true, 'モーダルで開く');
  assert.equal(body.style.overflow, 'hidden', '背後のスクロールを止める');

  closeButton.dispatch('click');
  assert.equal(dialog.open, false);
  assert.equal(img.src, '', '閉じたら表示画像をクリア');
  assert.equal(body.style.overflow, '', 'スクロールを復帰');
});

test('initLightbox: リンク内画像と絵文字画像は拡大対象外', async () => {
  const { initLightbox } = await import('../src/scripts/lightbox.ts');
  const { dialog } = setupLightbox();

  const linked = makeElement({
    attributes: { src: '/img/link.png' },
    closest: () => makeElement(), // リンク内なので truthy
  });
  const emoji = makeElement({
    attributes: { src: '/img/emoji.png' },
    classes: ['emoji-image'],
    closest: () => null,
  });
  queries.set('article img[src]', [linked, emoji]);

  initLightbox();

  linked.dispatch('click');
  emoji.dispatch('click');
  assert.equal(dialog.open, undefined, 'どちらもダイアログを開かない');
});

test('initLightbox: ダイアログ枠外クリックで閉じる (レターボックス)', async () => {
  const { initLightbox } = await import('../src/scripts/lightbox.ts');
  const { dialog } = setupLightbox();
  queries.set('article img[src]', []);
  initLightbox();

  dialog.open = true;
  dialog.dispatch('click', { target: dialog, clientX: 1, clientY: 1 });
  assert.equal(dialog.open, false, 'ダイアログ本体のクリックで閉じる');
});

// ---- embed.ts --------------------------------------------------------------------

test('initEmbeds: 読み込み済みで失敗した OG 画像はコンテナごと隠す', async () => {
  const { initEmbeds } = await import('../src/scripts/embed.ts');
  const container = makeElement();
  const broken = makeElement({
    complete: true,
    naturalWidth: 0, // 読み込み失敗
    closest: () => container,
  });

  queries.set('.link-preview-image', [broken]);
  initEmbeds();

  assert.equal(container.classList.contains('error'), true);
});

test('initEmbeds: 未読込の画像は error イベントを1回だけ待ち受ける', async () => {
  const { initEmbeds } = await import('../src/scripts/embed.ts');
  const container = makeElement();
  const pending = makeElement({
    complete: false,
    closest: () => container,
  });
  queries.set('.link-preview-image', [pending]);

  initEmbeds();
  assert.equal(container.classList.contains('error'), false, '読み込み中は隠さない');

  pending.dispatch('error');
  assert.equal(container.classList.contains('error'), true, '失敗を検知したら隠す');
});

// ---- floating.ts -----------------------------------------------------------------

test('initFloatingActions: 展開トグルが data-expanded と aria-expanded を往復', async () => {
  const { initFloatingActions } = await import('../src/scripts/floating.ts');
  const group = makeElement();
  const toggle = makeElement();
  registry.set('floating-group', group);
  registry.set('floating-toggle', toggle);
  initFloatingActions();

  toggle.dispatch('click');
  assert.equal(group.dataset.expanded, 'true');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');

  toggle.dispatch('click');
  assert.equal(group.dataset.expanded, 'false');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
});

test('initFloatingActions: トップ/ボタンはスクロール先へ移動する', async () => {
  const { initFloatingActions } = await import('../src/scripts/floating.ts');
  registry.set('floating-group', makeElement());
  registry.set('floating-toggle', makeElement());
  const topButton = makeElement();
  const bottomButton = makeElement();
  registry.set('floating-top', topButton);
  registry.set('floating-bottom', bottomButton);
  scrollY = 500;
  documentElement.scrollHeight = 3000;
  initFloatingActions();

  topButton.dispatch('click');
  assert.deepEqual(scrollCalls[0], [{ top: 0, behavior: 'instant' }], '先頭へ');

  bottomButton.dispatch('click');
  assert.deepEqual(scrollCalls[1], [{ top: 3000, behavior: 'instant' }], '末尾へ');
});

// ---- search.ts -------------------------------------------------------------------

test('initSearch: ダイアログ要素が無いページでは何もしない', async () => {
  const { initSearch } = await import('../src/scripts/search.ts');
  assert.doesNotThrow(() => initSearch(), '要素不足で例外を出さない');
});
