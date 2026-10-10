/**
 * remark プラグイン: Shoka 構文の前処理ラッパー。
 *
 * パイプラインで最初に走らせる必要がある。unified はパース後にプラグインを
 * 呼ぶため、VFile に残っている原文 (file.value) を前処理し、変更があれば
 * 新しい MDAST に再パースしてツリーを丸ごと差し替える。
 * 再パース側には本パイプラインと同じパーサ拡張 (GFM・math) を適用する —
 * 拡張を揃えないと、再パースでパース時拡張が生成したノードが消える。
 */
import type { Root } from 'mdast';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import type { VFile } from 'vfile';
import { type PreprocessOptions, preprocessShokaMarkdown } from './preprocessor';

export function remarkShokaPreprocess(options?: PreprocessOptions) {
  const pipeline = unified().use(remarkParse).use(remarkGfm);
  // remarkDirective をリパース側にも入れて :emoji[...] 等の textDirective が
  // 前処理でツリーが差し替えられても消えないようにする。
  pipeline.use(remarkDirective);
  // enableMath が false だと main パイプラインにも math が無いため、
  // 再パースでも math を有効にすると rehype-katex 未処理の code として残る。
  if (options?.math !== false) pipeline.use(remarkMath);

  return (tree: Root, file: VFile) => {
    const raw = String(file.value);
    if (!raw) return;
    const processed = preprocessShokaMarkdown(raw, options);
    if (processed === raw) return;
    tree.children = pipeline.parse(processed).children;
  };
}
