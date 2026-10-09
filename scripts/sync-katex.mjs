/**
 * node_modules/katex/dist から CSS とフォントを public/katex へコピーする。
 * postinstall で実行される (public/katex は .gitignore 対象)。
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'node_modules', 'katex', 'dist');
const dest = path.join(root, 'public', 'katex');

if (!existsSync(src)) {
  console.warn('[sync-katex] node_modules/katex/dist が見つかりません。スキップします。');
  process.exit(0);
}

mkdirSync(dest, { recursive: true });
cpSync(path.join(src, 'katex.min.css'), path.join(dest, 'katex.min.css'));
cpSync(path.join(src, 'fonts'), path.join(dest, 'fonts'), { recursive: true });
console.log('[sync-katex] public/katex へコピーしました');
