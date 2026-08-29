import { addDays, fromISO, toISO } from "./date";

// Deterministic cosmic guidance for a given day — no AI, no live ephemeris.
// Moon phase and Sun sign are computed from real cycles; the "planetary weather"
// is a deterministic flavour pick seeded by the date. It is theming, not advice.

export type Element = "Fire" | "Earth" | "Air" | "Water";

export interface DayInsight {
  score: number; // 1..5 cosmic stars
  headline: string; // e.g. "Waxing Gibbous in Virgo"
  reason: string; // 1–2 sentences of cosmic framing
  tags: string[];
  moon: string; // "Waxing Gibbous"
  moonEmoji: string;
  sunSign: string; // "Virgo"
  element: Element;
  luckySigns: string[]; // e.g. ["Virgo", "Taurus", "Capricorn"]
  signAdvice: string; // one line naming who should launch today
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ----------------------------- Moon phase ------------------------------ */

const SYNODIC = 29.530588853; // days
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14); // a known new moon

function noonUTC(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12);
}

function moonFraction(d: Date): number {
  const days = (noonUTC(d) - NEW_MOON_EPOCH) / 86400000;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  return age / SYNODIC; // 0..1
}

interface MoonInfo {
  name: string;
  short: string;
  emoji: string;
  base: number; // base launch score
  line: string;
}

function moonInfo(f: number): MoonInfo {
  if (f < 0.02 || f >= 0.98)
    return {
      name: "New Moon",
      short: "New moon",
      emoji: "🌑",
      base: 5,
      line: "New-moon energy is for beginnings — the single best day in the cycle to put something into the world.",
    };
  if (f < 0.23)
    return {
      name: "Waxing Crescent",
      short: "Waxing crescent",
      emoji: "🌒",
      base: 4,
      line: "The crescent is building. Early momentum favours a launch you intend to keep pushing on.",
    };
  if (f < 0.27)
    return {
      name: "First Quarter",
      short: "First quarter",
      emoji: "🌓",
      base: 4,
      line: "First-quarter moon is a push-through day — ship it and work the resistance.",
    };
  if (f < 0.48)
    return {
      name: "Waxing Gibbous",
      short: "Waxing gibbous",
      emoji: "🌔",
      base: 5,
      line: "The moon is gaining light toward full — visibility is climbing all week.",
    };
  if (f < 0.52)
    return {
      name: "Full Moon",
      short: "Full moon",
      emoji: "🌕",
      base: 4,
      line: "Full moon: maximum visibility and maximum noise. A strong day for a splash if your nerve holds.",
    };
  if (f < 0.73)
    return {
      name: "Waning Gibbous",
      short: "Waning gibbous",
      emoji: "🌖",
      base: 3,
      line: "Light is receding. Fine for a quiet ship, weaker for a big reveal.",
    };
  if (f < 0.77)
    return {
      name: "Last Quarter",
      short: "Last quarter",
      emoji: "🌗",
      base: 2,
      line: "Last-quarter moon is for cutting, not starting. Launch only if the calendar forces it.",
    };
  return {
    name: "Waning Crescent",
    short: "Waning crescent",
    emoji: "🌘",
    base: 1,
    line: "The dark of the moon — the cycle is closing out. Prep now, launch just after the new moon.",
  };
}

/* ------------------------------ Sun sign ------------------------------- */

const SIGNS: { name: string; glyph: string; element: Element; from: [number, number] }[] = [
  { name: "Capricorn", glyph: "♑", element: "Earth", from: [12, 22] },
  { name: "Aquarius", glyph: "♒", element: "Air", from: [1, 20] },
  { name: "Pisces", glyph: "♓", element: "Water", from: [2, 19] },
  { name: "Aries", glyph: "♈", element: "Fire", from: [3, 21] },
  { name: "Taurus", glyph: "♉", element: "Earth", from: [4, 20] },
  { name: "Gemini", glyph: "♊", element: "Air", from: [5, 21] },
  { name: "Cancer", glyph: "♋", element: "Water", from: [6, 21] },
  { name: "Leo", glyph: "♌", element: "Fire", from: [7, 23] },
  { name: "Virgo", glyph: "♍", element: "Earth", from: [8, 23] },
  { name: "Libra", glyph: "♎", element: "Air", from: [9, 23] },
  { name: "Scorpio", glyph: "♏", element: "Water", from: [10, 23] },
  { name: "Sagittarius", glyph: "♐", element: "Fire", from: [11, 22] },
];

function sunSign(d: Date) {
  // Last sign whose start date is on or before this date; early January wraps
  // back to Capricorn (which starts Dec 22).
  const ord = (d.getMonth() + 1) * 100 + d.getDate();
  const starts = SIGNS.map((s) => ({ s, o: s.from[0] * 100 + s.from[1] })).sort(
    (a, b) => a.o - b.o,
  );
  let chosen = starts[starts.length - 1].s;
  for (const { s, o } of starts) if (ord >= o) chosen = s;
  return chosen;
}

function trineOf(element: Element): string[] {
  return SIGNS.filter((s) => s.element === element).map((s) => s.name);
}

function glyph(signName: string): string {
  return SIGNS.find((s) => s.name === signName)?.glyph ?? "✷";
}

/* -------------------------- Planetary weather ------------------------- */

const MERC_SYNODIC = 115.88;
const MERC_EPOCH = Date.UTC(2025, 2, 15); // ~a retrograde-station date

function mercuryRetrograde(d: Date): boolean {
  const days = (noonUTC(d) - MERC_EPOCH) / 86400000;
  const f = (((days % MERC_SYNODIC) + MERC_SYNODIC) % MERC_SYNODIC) / MERC_SYNODIC;
  return f < 0.19; // ~22-day window, ~3x/year
}

const PLANETS: { tag: string; phrase: string; delta: number }[] = [
  { tag: "Mars-charged", phrase: "Mars lends drive — decisive, action-first launches cut through today.", delta: 1 },
  { tag: "Venus-favoured", phrase: "Venus blesses anything beautiful — design-led and creator products shine.", delta: 1 },
  { tag: "Jupiter-expansive", phrase: "Jupiter widens whatever you begin now — aim bigger than feels comfortable.", delta: 1 },
  { tag: "Saturn-solid", phrase: "Saturn rewards structure — useful, durable tools endure; pure hype fizzles.", delta: 0 },
  { tag: "Uranus-electric", phrase: "Uranus favours the disruptive and the strange — bold pivots land well.", delta: 1 },
  { tag: "Neptune-hazy", phrase: "Neptune blurs the signal — plain, concrete copy matters more than usual.", delta: 0 },
  { tag: "Pluto-intense", phrase: "Pluto turns the intensity up — category-defining plays resonate now.", delta: 0 },
];

/* ------------------------------ Assemble ----------------------------- */

function computeRaw(iso: string): DayInsight {
  const d = fromISO(iso);
  const h = hash(iso);

  const moon = moonInfo(moonFraction(d));
  const sign = sunSign(d);
  const trine = trineOf(sign.element);
  const retro = mercuryRetrograde(d);
  const planet = PLANETS[h % PLANETS.length];
  const jitter = ((h >> 5) % 3) - 1; // -1 | 0 | 1

  let score = moon.base + (retro ? -1 : planet.delta) + jitter;
  score = Math.max(1, Math.min(5, score));

  const reason = retro
    ? `${moon.line} But Mercury is retrograde — proofread every word and, if you can, hold for a soft launch over a big reveal.`
    : `${moon.line} ${planet.phrase}`;

  const elementWord =
    sign.element === "Fire"
      ? "Fire signs"
      : sign.element === "Earth"
        ? "Earth signs"
        : sign.element === "Air"
          ? "Air signs"
          : "Water signs";

  const signAdvice = `${elementWord} — ${trine
    .map((s) => `${glyph(s)} ${s}`)
    .join(", ")} — this day is aligned for you.`;

  const tags = [moon.short, `${sign.element} day`, retro ? "Mercury retrograde" : planet.tag];

  return {
    score,
    headline: `${moon.name} in ${sign.name}`,
    reason,
    tags,
    moon: moon.name,
    moonEmoji: moon.emoji,
    sunSign: sign.name,
    element: sign.element,
    luckySigns: trine,
    signAdvice,
  };
}

/* ---------------------- Best days of the week ----------------------- */

/** The 7 ISO dates of the Sunday-based week that `iso` falls in. */
function weekDays(iso: string): string[] {
  const d = fromISO(iso);
  const sunday = addDays(d, -d.getDay());
  return Array.from({ length: 7 }, (_, i) => toISO(addDays(sunday, i)));
}

/**
 * True for the three strongest launch windows in `iso`'s week — always exactly
 * three days per week, so the calendar always has gold "best days" to aim at.
 * Ranking is by raw cosmic score with a deterministic hash tie-break.
 */
export function isBestDayOfWeek(iso: string): boolean {
  const ranked = weekDays(iso)
    .map((w) => ({ w, s: computeRaw(w).score, h: hash(w) }))
    .sort((a, b) => b.s - a.s || a.h - b.h);
  return ranked.slice(0, 3).some((r) => r.w === iso);
}

export function getDayInsight(iso: string): DayInsight {
  const base = computeRaw(iso);
  if (isBestDayOfWeek(iso)) {
    base.score = 5;
    if (!base.tags.includes("Best day this week")) {
      base.tags = ["Best day this week", ...base.tags].slice(0, 4);
    }
    base.reason = `One of this week's three strongest launch windows. ${base.reason}`;
  }
  return base;
}

export function starRow(score: number): { filled: string; empty: string } {
  return { filled: "★".repeat(score), empty: "★".repeat(Math.max(0, 5 - score)) };
}

export function signGlyph(name: string): string {
  return glyph(name);
}
