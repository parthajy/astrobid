import { fromISO, WEEKDAYS } from "./date";

// Deterministic "why this day is good for launching" — no AI, just rules.
// Everything below is computed from the calendar so all 365+ days are covered.

export interface DayInsight {
  score: number; // 1..5 cosmic stars
  headline: string; // short label, e.g. "Mid-week peak"
  reason: string; // one sentence shown on hover
  tags: string[];
}

function hash(iso: string): number {
  let h = 2166136261;
  for (let i = 0; i < iso.length; i++) {
    h ^= iso.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): number {
  const first = new Date(year, month, 1).getDay();
  let day = 1 + ((7 + weekday - first) % 7) + (n - 1) * 7;
  return day;
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): number {
  const last = new Date(year, month + 1, 0);
  const offset = (7 + last.getDay() - weekday) % 7;
  return last.getDate() - offset;
}

/** Returns a holiday name if `d` is a low-attention US holiday, else null. */
function holidayName(d: Date): string | null {
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const fixed: Record<string, string> = {
    "0-1": "New Year's Day",
    "5-19": "Juneteenth",
    "6-4": "Independence Day",
    "10-11": "Veterans Day",
    "11-24": "Christmas Eve",
    "11-25": "Christmas Day",
    "11-26": "the day after Christmas",
    "11-31": "New Year's Eve",
  };
  const key = `${m}-${day}`;
  if (fixed[key]) return fixed[key];
  if (m === 0 && day === nthWeekdayOfMonth(y, 0, 1, 3)) return "MLK Day";
  if (m === 1 && day === nthWeekdayOfMonth(y, 1, 1, 3)) return "Presidents' Day";
  if (m === 4 && day === lastWeekdayOfMonth(y, 4, 1)) return "Memorial Day";
  if (m === 8 && day === nthWeekdayOfMonth(y, 8, 1, 1)) return "Labor Day";
  if (m === 9 && day === nthWeekdayOfMonth(y, 9, 1, 2)) return "Indigenous Peoples' / Columbus Day";
  if (m === 10) {
    const thx = nthWeekdayOfMonth(y, 10, 4, 4);
    if (day === thx) return "Thanksgiving";
    if (day === thx + 1) return "Black Friday";
  }
  return null;
}

const WEEKDAY_BASE = [2, 3, 5, 5, 4, 2, 1]; // Sun..Sat

const WEEKDAY_COPY: Record<number, { headline: string; reason: string; tags: string[] }> = {
  0: {
    headline: "Sunday reset",
    reason: "Sundays run quiet — good if you want a soft launch before the week's noise hits.",
    tags: ["Low competition", "Weekend"],
  },
  1: {
    headline: "Monday momentum",
    reason: "Inboxes are full on Mondays, but builders are back at their desks and planning the week.",
    tags: ["Fresh week", "Builder audience"],
  },
  2: {
    headline: "Tuesday prime time",
    reason: "Tuesday is the classic launch day — peak attention from the maker and investor crowd.",
    tags: ["High traffic", "Mid-week peak"],
  },
  3: {
    headline: "Wednesday peak",
    reason: "Mid-week engagement is at its highest and the weekend is still far enough away.",
    tags: ["High traffic", "Mid-week peak"],
  },
  4: {
    headline: "Thursday reach",
    reason: "Strong reach with slightly less competition than Tuesday or Wednesday.",
    tags: ["Good traffic", "Less crowded"],
  },
  5: {
    headline: "Friday fade",
    reason: "Attention drops into the afternoon as people check out for the weekend.",
    tags: ["Fading attention", "Low competition"],
  },
  6: {
    headline: "Saturday lull",
    reason: "The quietest day of the week — cheap to win, but expect a smaller crowd.",
    tags: ["Lowest competition", "Weekend"],
  },
};

export function getDayInsight(iso: string): DayInsight {
  const d = fromISO(iso);
  const wd = d.getDay();
  const month = d.getMonth();
  const dom = d.getDate();
  const r = hash(iso);

  const holiday = holidayName(d);
  if (holiday) {
    return {
      score: 1,
      headline: "Holiday — attention low",
      reason: `Most of your audience is offline for ${holiday}. Win it cheap, but temper expectations.`,
      tags: ["Holiday", "Lowest traffic"],
    };
  }

  let score = WEEKDAY_BASE[wd];
  const base = WEEKDAY_COPY[wd];
  const tags = [...base.tags];
  const notes: string[] = [];

  // New-year momentum
  if (month === 0 && dom >= 6 && dom <= 16) {
    score += 1;
    tags.push("New-year surge");
    notes.push("early-January 'new year, new stack' energy is real");
  }
  // Quarter-end noise
  const isQuarterMonth = month === 2 || month === 5 || month === 8 || month === 11;
  const lastOfMonth = new Date(d.getFullYear(), month + 1, 0).getDate();
  if (isQuarterMonth && dom > lastOfMonth - 5) {
    score -= 1;
    tags.push("Quarter-end noise");
    notes.push("teams are heads-down on quarter close");
  }
  // First business days of the month — budgets refresh
  if (dom <= 3 && wd !== 0 && wd !== 6) {
    score += 1;
    tags.push("Fresh budgets");
    notes.push("new-month budgets just unlocked");
  }
  // Late-August / mid-summer slump
  if ((month === 6 && dom > 20) || (month === 7 && dom < 20)) {
    score -= 1;
    tags.push("Summer slump");
    notes.push("mid-summer travel thins out the crowd");
  }
  // Deep December
  if (month === 11 && dom >= 18) {
    score -= 1;
    tags.push("Holiday wind-down");
    notes.push("the tech world is already logging off for the year");
  }

  score = Math.max(1, Math.min(5, score));

  let reason = base.reason;
  if (notes.length) {
    const pick = notes[Math.floor(r * notes.length)];
    reason = `${base.reason} Plus, ${pick}.`;
  }

  return {
    score,
    headline: base.headline,
    reason,
    tags: Array.from(new Set(tags)).slice(0, 3),
  };
}

export function starString(score: number): string {
  return "⭐".repeat(score) + "✦".repeat(Math.max(0, 5 - score));
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[fromISO(iso).getDay()];
}
