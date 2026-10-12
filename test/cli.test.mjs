/**
 * scripts/cli.ts の単体テスト。
 *
 * 生成スクリプトの入口 (引数パース・例外時もビルドを止めない runMain) を固定する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { parseCliArgs, runMain } from '../scripts/cli.ts';

const SPEC = {
  force: { type: 'boolean' },
  out: { type: 'string', default: 'dist' },
};
const USAGE = '使い方: generate --force --out <dir>';

test('parseCliArgs: 未指定は boolean=false / string=既定値', () => {
  assert.deepEqual(parseCliArgs([], SPEC, USAGE), { force: false, out: 'dist' });
  assert.deepEqual(
    parseCliArgs([], { out: { type: 'string' } }, USAGE),
    { out: '' },
    '既定値の無い string は空文字',
  );
});

test('parseCliArgs: --flag は true、--name <値> は次の引数を値にする', () => {
  assert.deepEqual(parseCliArgs(['--force'], SPEC, USAGE), { force: true, out: 'dist' });
  assert.deepEqual(parseCliArgs(['--out', 'build/x'], SPEC, USAGE), {
    force: false,
    out: 'build/x',
  });
  assert.deepEqual(
    parseCliArgs(['--out', 'a', '--force'], SPEC, USAGE),
    {
      force: true,
      out: 'a',
    },
    '順不同で両方受け付ける',
  );
});

test('parseCliArgs: 未知の引数は usage 付きで throw する (黙殺しない)', () => {
  assert.throws(
    () => parseCliArgs(['--nope'], SPEC, USAGE),
    (error) => error.message.includes('Unknown argument: --nope') && error.message.includes(USAGE),
  );
});

test('parseCliArgs: 値を取る string に値が付いていない場合は throw', () => {
  assert.throws(() => parseCliArgs(['--out'], SPEC, USAGE), /requires a value/);
  assert.throws(
    () => parseCliArgs(['--out', '--force'], SPEC, USAGE),
    /requires a value/,
    '次の引数がフラグなら値扱いしない',
  );
});

test('runMain: 成功時は done を経過秒つきで出し after を呼ぶ', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (message) => logs.push(String(message));
  try {
    const afterCalls = [];
    await runMain(async () => ({
      done: '生成が完了しました',
      after: () => afterCalls.push('after'),
    }));
    assert.deepEqual(afterCalls, ['after'], 'done の出力後に実行される');
  } finally {
    console.log = originalLog;
  }
  assert.equal(logs.length, 1);
  assert.match(logs[0], /生成が完了しました in \d+\.\d+s/, '経過秒を添えて出力する');
});

test('runMain: 何も返さない処理は出力なし', async () => {
  const logs = [];
  const originalLog = console.log;
  console.log = (message) => logs.push(String(message));
  try {
    await runMain(async () => undefined);
  } finally {
    console.log = originalLog;
  }
  assert.deepEqual(logs, []);
});

test('runMain: 例外は握りつぶさず exitCode を立てる', async () => {
  const errors = [];
  const originalError = console.error;
  const originalExitCode = process.exitCode;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  process.exitCode = 0;
  try {
    await runMain(() => {
      throw new Error('boom');
    });
    assert.equal(process.exitCode, 1, '呼び出し元 (CI) を止めないため非0で継続');
  } finally {
    console.error = originalError;
    process.exitCode = originalExitCode;
  }
  assert.match(errors.join('\n'), /Error:/);
  assert.match(errors.join('\n'), /boom/, '原因を出力する');
});
