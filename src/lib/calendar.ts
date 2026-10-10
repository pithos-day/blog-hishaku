/**
 * サイドパネル用カレンダー。
 * 直近記事の月を対象月とし (静的ビルドで決定的になるため)、
 * 記事がある日付はその最新記事へリンクする。週の開始は日曜。
 */
import { siteConfig } from './config';
import { getYearMonth } from './date';
import { getPostSlug, getPublishedPosts, type PostEntry, sortByDateDesc } from './posts';

export interface CalendarDay {
  /** 1–31 */
  day: number;
  /** その日に公開された記事 (日付降順) */
  posts: PostEntry[];
}

export interface CalendarMonth {
  year: number;
  /** 1–12 */
  month: number;
  /** 週の配列。先頭・末尾の週は null で埋める (日曜始まり) */
  weeks: (CalendarDay | null)[][];
}

/** 指定年月のカレンダーを組み立てる (記事は空でも月だけ返す) */
export function buildMonthCalendar(
  year: number,
  month: number,
  posts: PostEntry[],
  timezone: string,
): CalendarMonth {
  const dayMap = new Map<number, PostEntry[]>();
  for (const post of posts) {
    const ym = getYearMonth(post.data.date, timezone);
    if (ym.year !== year || ym.month !== month) continue;
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      day: 'numeric',
    }).formatToParts(post.data.date);
    const day = Number(parts.find((part) => part.type === 'day')?.value ?? '0');
    const list = dayMap.get(day);
    if (list) list.push(post);
    else dayMap.set(day, [post]);
  }

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  const cells: (CalendarDay | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    const dayPosts = dayMap.get(day);
    cells.push(dayPosts ? { day, posts: dayPosts } : { day, posts: [] });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return { year, month, weeks };
}

/**
 * サイドバーカレンダーを取得する。
 * 月の決定: 直近記事の月 → 記事が無い場合のフォールバックとして現在月 (サイトTZ)。
 */
export async function getSidebarCalendar(): Promise<CalendarMonth> {
  const timezone = siteConfig.site.timezone;
  const posts = sortByDateDesc(await getPublishedPosts());

  let year: number;
  let month: number;
  const latest = posts[0];
  if (latest) {
    ({ year, month } = getYearMonth(latest.data.date, timezone));
  } else {
    ({ year, month } = getYearMonth(new Date(), timezone));
  }

  return buildMonthCalendar(year, month, posts, timezone);
}

/** カレンダーのセル用: その日の最新記事スラッグ (無い日は null) */
export function getDayLink(day: CalendarDay | null): string | null {
  if (!day || day.posts.length === 0) return null;
  return `/post/${getPostSlug(day.posts[0])}`;
}
