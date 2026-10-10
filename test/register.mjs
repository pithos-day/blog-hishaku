/** `node --test` 実行時に test/ts-resolver.mjs を登録する (拡張子なし TS import の解決用) */
import { register } from 'node:module';

register('./ts-resolver.mjs', import.meta.url);
