/**
 * 画像ライトボックス
 *
 * 本文の画像 (リンク内・絵文字画像を除く) をクリックすると <dialog> で全画面表示する。
 * Esc キー / 閉じるアイコン / 画像外 (レターボックス) クリックで閉じる。
 */

export function initLightbox(): void {
  const dialog = document.getElementById('lightbox-dialog') as HTMLDialogElement | null;
  const img = document.getElementById('lightbox-img') as HTMLImageElement | null;
  const closeButton = document.getElementById('lightbox-close');
  if (!dialog || !img) return;

  // 本文画像にクリックハンドラを付与
  const images = document.querySelectorAll<HTMLImageElement>('article img[src]');
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

  closeButton?.addEventListener('click', close);

  dialog.addEventListener('click', (e) => {
    // ダイアログ自体 (レターボックス含む枠外) をクリックしたら閉じる
    if (e.target === dialog) {
      close();
      return;
    }
    // object-fit: contain のレターボックス (画像実体の外側) クリックで閉じる
    if (e.target === img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      const rect = img.getBoundingClientRect();
      const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
      const contentW = img.naturalWidth * scale;
      const contentH = img.naturalHeight * scale;
      const x = e.clientX - rect.left - (rect.width - contentW) / 2;
      const y = e.clientY - rect.top - (rect.height - contentH) / 2;
      if (x < 0 || y < 0 || x > contentW || y > contentH) close();
    }
  });

  dialog.addEventListener('close', () => {
    // 閉じた直後に再オープンすると、キュー済みの close イベントが
    // 新しい画像の src を消してしまうため、開き直していない場合のみクリアする
    if (!dialog.open) {
      img.src = '';
      document.body.style.overflow = '';
    }
  });
}
