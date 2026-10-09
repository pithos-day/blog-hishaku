/**
 * サイトタイムゾーン基準の日付パース/書式化。
 * astro-koharu が date-fns-tz で行っていた処理の最小実装(依存ライブラリなし)。
 */

const TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,9}))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/;

/** 指定時点におけるタイムゾーンの UTC オフセット(ms・東経 positive) */
export function getTimezoneOffsetMs(timeZone: string, date: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  const wallClockAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return wallClockAsUtc + date.getMilliseconds() - date.getTime();
}

/**
 * YAML パーサが UTC として解釈した日時を、実はサイトタイムゾーンの壁時計時刻だった
 * として再解釈する(gray-matter/js-yaml のタイムゾーン誤解釈対策)。
 */
export function reinterpretUtcAsTimezone(date: Date, timeZone: string): Date {
  const wallClock = date.getTime();
  const first = wallClock - getTimezoneOffsetMs(timeZone, new Date(wallClock));
  return new Date(wallClock - getTimezoneOffsetMs(timeZone, new Date(first)));
}

function parseOffsetMs(offset: string): number {
  if (offset === 'Z') return 0;
  const match = /^([+-])(\d{2}):?(\d{2})$/.exec(offset);
  if (!match) return 0;
  const sign = match[1] === '-' ? -1 : 1;
  return sign * (Number(match[2]) * 60 + Number(match[3])) * 60_000;
}

/**
 * frontmatter の date/updated をパースする。
 * 受け付ける形式:
 *  - Date オブジェクト(YAML がパース済みの値)→ サイトタイムゾーンとして再解釈
 *  - "YYYY-MM-DD" / "YYYY-MM-DD HH:mm:ss" → サイトタイムゾーンの壁時計時刻
 *  - オフセット付き ISO 文式 ("...+09:00", "...Z") → 絶対時刻として正しく解釈
 */
export function parsePostDate(value: string | Date, timeZone: string): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('日付が不正な Date オブジェクトです');
    }
    return reinterpretUtcAsTimezone(value, timeZone);
  }

  const match = TIMESTAMP_PATTERN.exec(value.trim());
  if (!match) {
    throw new Error(
      `日付 "${value}" を解析できません (YYYY-MM-DD または YYYY-MM-DD HH:mm:ss 形式)`,
    );
  }

  const [, year, month, day, hour = '00', minute = '00', second = '00', fraction, offset] = match;
  const ms = fraction ? Math.round(Number(`0.${fraction}`) * 1000) : 0;
  const wallClock = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    ms,
  );

  if (offset) {
    return new Date(wallClock - parseOffsetMs(offset));
  }

  // 壁時計時刻 → サイトタイムゾーンの絶対時刻へ (DST の影響を 2 pass で吸収)
  const first = wallClock - getTimezoneOffsetMs(timeZone, new Date(wallClock));
  return new Date(wallClock - getTimezoneOffsetMs(timeZone, new Date(first)));
}

/** 日付をサイトタイムゾーン基準でローカライズして整形する */
export function formatDate(
  date: Date,
  timeZone: string,
  locale = 'ja-JP',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' },
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
}

/** アーカイブ等で使う年月パケット (サイトタイムゾーン基準) */
export function getYearMonth(date: Date, timeZone: string): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? '0');
  return { year: get('year'), month: get('month') };
}
