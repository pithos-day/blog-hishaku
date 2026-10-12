/**
 * calendar.ts の単体テスト。
 *
 * 週グリッドは日曜始まり・先頭/末尾を null で埋める。
 * 月の日数 (4/6/2月・閏年) と記事の日付グルーピングはレイアウトの崩れに直結する。
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMonthCalendar, getDayLink } from '../src/lib/calendar.ts';

const TZ = 'Asia/Tokyo';

/** テスト用の疑似 PostEntry (buildMonthCalendar は data.date だけを見る) */
const post = (iso, id = 'note/test') => ({ id, data: { date: new Date(iso) } });

test('buildMonthCalendar: 2026年1月 (木曜始まり31日) は5週で埋まる', () => {
  const cal = buildMonthCalendar(2026, 1, [], TZ);
  assert.equal(cal.year, 2026);
  assert.equal(cal.month, 1);
  assert.equal(cal.weeks.length, 5);
  assert.equal(cal.weeks[0].length, 7, '先頭の週は必ず7セル');
  assert.deepEqual(
    cal.weeks[0].slice(0, 4),
    [null, null, null, null],
    '1/1 (木) より前は null 埋め',
  );
  assert.equal(cal.weeks[0][4]?.day, 1, '1日は5セル目 (日曜始まり)');
  assert.equal(cal.weeks[4][6]?.day, 31, '末尾は 31 日で締まる');
});

test('buildMonthCalendar: 2026年2月 (日曜始まり28日) は4週ちょうど', () => {
  const cal = buildMonthCalendar(2026, 2, [], TZ);
  assert.equal(cal.weeks.length, 4, '4 + 28 = 28セルなので4週');
  assert.equal(cal.weeks[0][0]?.day, 1, '月初に null は要らない');
  assert.equal(cal.weeks[3][6]?.day, 28, '月末は土曜');
});

test('buildMonthCalendar: 閏年の2月は29日で末尾を null で埋める', () => {
  const cal = buildMonthCalendar(2024, 2, [], TZ);
  assert.equal(cal.weeks.length, 5, '4 + 29 = 33セル → 35に丸める');
  assert.equal(cal.weeks[4][4]?.day, 29, '29日は5週目の木曜');
  assert.equal(cal.weeks[4][5], null, '余りセルは null');
  assert.equal(cal.weeks[4][6], null);
});

test('buildMonthCalendar: 記事がある日のセルに記事が入り、他月の記事は入らない', () => {
  const cal = buildMonthCalendar(
    2026,
    1,
    [
      post('2026-01-15T03:00:00Z', 'note/a'),
      post('2026-01-15T05:00:00Z', 'note/b'),
      post('2026-01-20T03:00:00Z', 'note/c'),
      post('2025-06-15T03:00:00Z', 'note/other-month'),
    ],
    TZ,
  );
  const withPosts = cal.weeks.flat().filter((cell) => cell && cell.posts.length > 0);
  assert.equal(withPosts.length, 2, '記事があるのは 1/15 と 1/20 の2日だけ');

  const jan15 = cal.weeks[2][4];
  assert.equal(jan15.day, 15);
  assert.deepEqual(
    jan15.posts.map((p) => p.id),
    ['note/a', 'note/b'],
    '同じ日の記事は入力順に並ぶ',
  );
  const jan1 = cal.weeks[0][4];
  assert.deepEqual(jan1.posts, [], '記事の無い日は空配列 (null ではない)');
});

test('getDayLink: 記事の無い日はリンク無し、ある日は最新記事の URL', () => {
  assert.equal(getDayLink(null), null, '空白セル');
  assert.equal(getDayLink({ day: 1, posts: [] }), null, '記事の無い日');

  const cal = buildMonthCalendar(2026, 1, [post('2026-01-15T03:00:00Z', 'Note/Hello')], TZ);
  const day15 = cal.weeks[2][4];
  assert.equal(getDayLink(day15), '/post/note/hello/', 'スラッグは小文字化される');
});
