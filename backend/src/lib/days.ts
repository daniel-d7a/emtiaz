export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export type WeekdayKey = (typeof WEEKDAYS)[number];

const DAY_ALIASES: Record<string, WeekdayKey> = {
  sun: 'Sun',
  sunday: 'Sun',
  الأحد: 'Sun',
  الاحد: 'Sun',
  أحد: 'Sun',
  احد: 'Sun',
  mon: 'Mon',
  monday: 'Mon',
  الاثنين: 'Mon',
  الإثنين: 'Mon',
  اثنين: 'Mon',
  إثنين: 'Mon',
  tue: 'Tue',
  tues: 'Tue',
  tuesday: 'Tue',
  الثلاثاء: 'Tue',
  ثلاثاء: 'Tue',
  wed: 'Wed',
  weds: 'Wed',
  wednesday: 'Wed',
  الأربعاء: 'Wed',
  الاربعاء: 'Wed',
  أربعاء: 'Wed',
  اربعاء: 'Wed',
  thu: 'Thu',
  thur: 'Thu',
  thurs: 'Thu',
  thursday: 'Thu',
  الخميس: 'Thu',
  خميس: 'Thu',
  fri: 'Fri',
  friday: 'Fri',
  الجمعة: 'Fri',
  جمعة: 'Fri',
  الجمعه: 'Fri',
  جمعه: 'Fri',
  sat: 'Sat',
  saturday: 'Sat',
  السبت: 'Sat',
  سبت: 'Sat',
};

function resolveWeekday(token: string): WeekdayKey | null {
  const cleaned = token.trim().replace(/^يوم\s+/, '').toLowerCase();
  return DAY_ALIASES[cleaned] ?? null;
}

export function normalizeDays(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const tokens = trimmed
    .split(/[,،/]+|\s+و\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return null;
  const resolved = tokens.map(resolveWeekday);
  if (resolved.every((day): day is WeekdayKey => day !== null)) {
    const unique = new Set(resolved);
    return WEEKDAYS.filter((day) => unique.has(day)).join(', ');
  }
  return tokens.map((token, i) => resolved[i] ?? token).join(', ');
}
