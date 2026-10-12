/**
 * テスト専用の追加リゾルバ。
 *
 * src の TS モジュールはプロジェクト規約として拡張子なしの相対インポート
 * (例: `./escape`) を使うが、Node の ESM リゾルバは拡張子必須のため
 * `node --test` から直接読めない。相対パス指定が解決できない場合に
 * `.ts` / `/index.ts` を付け直すことで、ソースを変更せずに解決する。
 *
 * 併せて Vite / Astro 固有の記法もテスト用に読み替える:
 *  - `astro:content` … Vite の仮想モジュールなので空のスタブへ差し替える
 *  - `@/…` (tsconfig paths) … `src/` へ写像する
 *  - `*.yaml?raw` … Node に raw 読み込みは無いので文字列として export する
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ASTRO_CONTENT_STUB = new URL('./stubs/astro-content.mjs', import.meta.url).href;
const SRC_ROOT = new URL('../src/', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'astro:content') {
    return { shortCircuit: true, url: ASTRO_CONTENT_STUB };
  }
  // '@/' エイリアスは絶対 file URL に写像してから通常解決へ流す
  const spec = specifier.startsWith('@/') ? `${SRC_ROOT}${specifier.slice(2)}` : specifier;
  try {
    return await nextResolve(spec, context);
  } catch (error) {
    const recoverable =
      error?.code === 'ERR_MODULE_NOT_FOUND' || error?.code === 'ERR_UNSUPPORTED_DIR_IMPORT';
    const rewritable = spec.startsWith('.') || spec.startsWith('file:');
    if (!recoverable || !rewritable) throw error;
    for (const suffix of ['.ts', '/index.ts']) {
      try {
        return await nextResolve(`${spec}${suffix}`, context);
      } catch {
        // 次の候補を試す
      }
    }
    throw error;
  }
}

export async function load(url, context, nextLoad) {
  // Vite の `?raw` 読み込み (config/site.yaml) を Node 用に読み替える
  if (url.includes('.yaml')) {
    const path = fileURLToPath(url.split('?')[0]);
    const source = `export default ${JSON.stringify(readFileSync(path, 'utf8'))};`;
    return { format: 'module', source, shortCircuit: true };
  }
  return nextLoad(url, context);
}
