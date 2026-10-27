/**
 * 本文画像のレイアウト調整。
 *
 * 画像の実寸から縦長かどうかを判定し、連続する縦長画像を横一列にまとめる。
 * 高さの上限は CSS 側でも設定しているため、このスクリプトは
 * 縦長判定と横並びの組み立てだけを担当する。
 */

/** 縦長とみなす縦横比の下限 (高さ / 幅) */
const PORTRAIT_RATIO_THRESHOLD = 1.2;

/** 画像の読み込みが落ち着いてから横並びを組み替える */
const REGROUP_DELAY_MS = 100;

/** 同じ画像に load ハンドラを重ねないための記録 */
const preparedImages = new WeakSet<HTMLImageElement>();

/** 実寸が縦長かどうか。読み込み前 (0px) は false。 */
export function isPortraitImage(width: number, height: number): boolean {
  return width > 0 && height > width * PORTRAIT_RATIO_THRESHOLD;
}

/** 幅を明示した画像は、指定幅を優先して横並びの対象外にする。 */
function hasExplicitWidth(image: HTMLImageElement): boolean {
  return image.hasAttribute('width');
}

/** 画像の実寸を wrapper のクラスと data 属性へ反映する。 */
function markWrapper(image: HTMLImageElement): void {
  const wrapper = image.closest<HTMLElement>('.markdown-image-wrapper');
  if (!wrapper) return;

  if (hasExplicitWidth(image) || !image.naturalWidth || !image.naturalHeight) {
    wrapper.classList.remove('is-portrait');
    wrapper.removeAttribute('data-aspect-ratio');
    return;
  }

  wrapper.dataset.aspectRatio = String(image.naturalWidth / image.naturalHeight);
  wrapper.classList.toggle('is-portrait', isPortraitImage(image.naturalWidth, image.naturalHeight));
}

/** 空白テキストだけを挟んで隣り合っているか。 */
function isAdjacentSibling(previous: Element, next: Element): boolean {
  let sibling = previous.nextSibling;
  while (sibling) {
    if (sibling.nodeType === Node.TEXT_NODE && sibling.textContent?.trim() === '') {
      sibling = sibling.nextSibling;
      continue;
    }
    return sibling === next;
  }
  return false;
}

/** 既存の横並び行を解除して、画像を元の兄弟位置へ戻す。 */
function unwrapStrips(container: Element): void {
  for (const strip of container.querySelectorAll<HTMLElement>('.markdown-image-strip')) {
    const parent = strip.parentNode;
    if (!parent) continue;

    // 次の組み替えで flex を付け直すため、残留したインライン指定も消す
    for (const wrapper of Array.from(strip.children)) {
      (wrapper as HTMLElement).style.flex = '';
      parent.insertBefore(wrapper, strip);
    }
    strip.remove();
  }
}

/** 縦長画像のまとまりを 1 行に収める。 */
function createStrip(wrappers: HTMLElement[]): void {
  const strip = document.createElement('div');
  strip.className = 'markdown-image-strip';
  wrappers[0].before(strip);

  const fragment = document.createDocumentFragment();
  for (const wrapper of wrappers) {
    // 幅を縦横比に比例させると、行内の画像の高さが揃う
    const ratio = Number(wrapper.dataset.aspectRatio);
    wrapper.style.flex = Number.isFinite(ratio) && ratio > 0 ? `${ratio} 1 0%` : '1 1 0%';
    fragment.appendChild(wrapper);
  }
  strip.appendChild(fragment);
}

/** 連続する縦長画像を 1 行にまとめる。3 枚以上も同じ行に並べる。 */
export function groupPortraitImages(container: Element): void {
  unwrapStrips(container);

  const wrappers = Array.from(container.querySelectorAll<HTMLElement>('.markdown-image-wrapper'));
  let current: HTMLElement[] = [];

  const flush = () => {
    if (current.length >= 2) createStrip(current);
    current = [];
  };

  for (const wrapper of wrappers) {
    if (!wrapper.classList.contains('is-portrait')) {
      flush();
      continue;
    }

    const previous = current[current.length - 1];
    if (previous && isAdjacentSibling(previous, wrapper)) {
      current.push(wrapper);
    } else {
      flush();
      current = [wrapper];
    }
  }
  flush();
}

/** 本文の画像を監視し、読み込みに合わせて縦長画像の行を組み替える。 */
export function initImageEnhancements(): void {
  const container = document.querySelector<HTMLElement>('article');
  if (!container) return;

  const images = container.querySelectorAll<HTMLImageElement>('.markdown-image');
  if (images.length === 0) return;

  let timer: ReturnType<typeof setTimeout> | undefined;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => groupPortraitImages(container), REGROUP_DELAY_MS);
  };

  for (const image of images) {
    if (preparedImages.has(image)) continue;
    preparedImages.add(image);

    const handleLoad = () => {
      markWrapper(image);
      schedule();
    };

    if (image.complete) {
      if (image.naturalWidth > 0) handleLoad();
      continue;
    }

    image.addEventListener('load', handleLoad, { once: true });
  }

  schedule();
}
