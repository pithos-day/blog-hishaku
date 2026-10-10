/**
 * テスト専用の追加リゾルバ。
 *
 * src の TS モジュールはプロジェクト規約として拡張子なしの相対インポート
 * (例: `./escape`) を使うが、Node の ESM リゾルバは拡張子必須のため
 * `node --test` から直接読めない。相対パス指定が解決できない場合に
 * `.ts` / `/index.ts` を付け直すことで、ソースを変更せずに解決する。
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error?.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
    for (const suffix of ['.ts', '/index.ts']) {
      try {
        return await nextResolve(`${specifier}${suffix}`, context);
      } catch {
        // 次の候補を試す
      }
    }
    throw error;
  }
}
