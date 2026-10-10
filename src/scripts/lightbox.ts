/**
 * 画像ライトボックス
 *
 * 本文の .markdown-image をクリックすると <dialog> で全画面表示する。
 * Esc キー / バックドロップクリックで閉じる。
 */

export function initLightbox(): void {
  const dialog = document.getElementById('lightbox-dialog') as HTMLDialogElement | null;
  const img = document.getElementById('lightbox-img') as HTMLImageElement | null;
  if (!dialog || !img) return;

  // 本文画像にクリックハンドラを付与
  const images = document.querySelectorAll<HTMLImageElement>(
    'article .markdown-image, article img[src]',
  );
  images.forEach((image) => {
    // リンク内画像はスキップ (リンク先を開く挙動を優先)
    // 絵文字画像は拡大対象外
    if (image.closest('a') || image.classList.contains('emoji-image')) return;

    image.style.cursor = 'zoom-in';
    image.addEventListener('click', () => {
      const src = image.getAttribute('src');
      if (!src) return;
      img.src = src;
      img.alt = image.alt ?? '';
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    });
  });

  function close() {
    dialog?.close();
    if (img) img.src = '';
    document.body.style.overflow = '';
  }

  dialog.addEventListener('click', (e) => {
    // バックドロップ (dialog 要素自体) をクリックしたら閉じる
    if (e.target === dialog) close();
  });

  dialog.addEventListener('close', () => {
    if (img) img.src = '';
    document.body.style.overflow = '';
  });
}
