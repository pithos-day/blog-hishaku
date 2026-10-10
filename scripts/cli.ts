/**
 * 生成スクリプト共通の CLI ユーティリティ。
 */

/**
 * 時間計測付きでメイン処理を実行する。
 *
 * 戻り値の `done` を `in <elapsed>s` 付きで出力し、`after` はその後に実行する。
 * 例外は捕捉して exitCode=1 を立てる (ビルドパイプラインを止めない)。
 */
export async function runMain(
  run: () => Promise<{ done: string; after?: () => void | Promise<void> } | undefined>,
): Promise<void> {
  const startTime = Date.now();
  try {
    const result = await run();
    if (result) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n${result.done} in ${elapsed}s`);
      await result.after?.();
    }
  } catch (error) {
    console.error('\nError:', error);
    process.exitCode = 1;
  }
}

/** フラグ定義: `--flag` (boolean) か `--name <値>` (string) */
export type ArgSpec = { type: 'boolean' } | { type: 'string'; default?: string };

export type ParsedArgs<S extends Record<string, ArgSpec>> = {
  [K in keyof S]: S[K]['type'] extends 'string' ? string : boolean;
};

/**
 * 簡易フラグパーサ。
 * 未知の引数・値なしの string フラグは Usage 付きで throw する (黙殺しない)。
 */
export function parseCliArgs<S extends Record<string, ArgSpec>>(
  argv: string[],
  specs: S,
  usage: string,
): ParsedArgs<S> {
  const result: Record<string, string | boolean> = {};
  for (const [name, spec] of Object.entries(specs)) {
    result[name] = spec.type === 'string' ? (spec.default ?? '') : false;
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const name = arg.replace(/^--/, '');
    const spec = specs[name];
    if (!spec) {
      throw new Error(`Unknown argument: ${arg}\n${usage}`);
    }
    if (spec.type === 'boolean') {
      result[name] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Option ${arg} requires a value\n${usage}`);
    }
    result[name] = value;
    i++;
  }
  return result as ParsedArgs<S>;
}
