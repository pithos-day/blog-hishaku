import { siteConfig } from './config';
import { getYearMonth } from './date';
import { getPublishedPosts, type PostEntry, sortByDateDesc } from './posts';

export interface ArchiveMonth {
  year: number;
  /** 1–12 */
  month: number;
  posts: PostEntry[];
}

export interface ArchiveYear {
  year: number;
  months: ArchiveMonth[];
}

/**
 * 記事を年月 (サイトタイムゾーン基準) でグループ化する。
 * 戻り値は年・月とも降順。アーカイブは日付降順 (sticky 順は使わない)。
 */
export async function getArchives(): Promise<ArchiveYear[]> {
  const posts = sortByDateDesc(await getPublishedPosts());
  const timezone = siteConfig.site.timezone;

  const years = new Map<number, ArchiveYear>();
  for (const post of posts) {
    const { year, month } = getYearMonth(post.data.date, timezone);
    let yearEntry = years.get(year);
    if (!yearEntry) {
      yearEntry = { year, months: [] };
      years.set(year, yearEntry);
    }
    let monthEntry = yearEntry.months.find((m) => m.month === month);
    if (!monthEntry) {
      monthEntry = { year, month, posts: [] };
      yearEntry.months.push(monthEntry);
    }
    monthEntry.posts.push(post);
  }

  return [...years.values()]
    .sort((a, b) => b.year - a.year)
    .map((year) => ({
      ...year,
      months: year.months.sort((a, b) => b.month - a.month),
    }));
}
