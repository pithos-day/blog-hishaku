/**
 * remark プラグイン: Shoka 構文の前処理ラッパー。
 *
 * パイプラインで最初に走らせる必要がある。unified はパース後にプラグインを
 * 呼ぶため、VFile に残っている原文 (file.value) を前処理し、変更があれば
 * 新しい MDAST に再パースしてツリーを丸ごと差し替える。
 * 再パース側には本パイプラインと同じパーサ拡張 (GFM 等) を適用する。
 */
import type { Root } from 'mdast';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { VFile } from 'vfile';
import { type PreprocessOptions, preprocessShokaMarkdown } from './preprocessor';

export function remarkShokaPreprocess(options?: PreprocessOptions) {
  const pipeline = unified().use(remarkParse).use(remarkGfm);

  return (tree: Root, file: VFile) => {
    const raw = String(file.value);
    if (!raw) return;
    const processed = preprocessShokaMarkdown(raw, options);
    if (processed === raw) return;
    tree.children = pipeline.parse(processed).children;
  };
}
