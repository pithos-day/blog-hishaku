/**
 * リンク埋め込みの初期化。
 * ツイートカードはビルド時に fxtwitter API から取得して静的描画されるため、
 * クライアント側で行うのは OG プレビュー画像の読み込み失敗時のみ。
 */

/** ビルド時取得した OG 画像が読み込めなかったらコンテナごと隠す */
function hideBrokenPreviewImages(): void {
  document.querySelectorAll<HTMLImageElement>('.link-preview-image').forEach((image) => {
    const hide = () => {
      image.closest('.link-preview-image-container')?.classList.add('error');
    };
    if (image.complete && image.naturalWidth === 0) hide();
    else image.addEventListener('error', hide, { once: true });
  });
}

export function initEmbeds(): void {
  hideBrokenPreviewImages();
}
