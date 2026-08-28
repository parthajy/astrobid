// All calendar math uses local-time Date objects and "YYYY-MM-DD" strings.

export function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 6x7 grid of dates covering the month `d` lives in (weeks start Sunday). */
export function monthGrid(d: Date): Date[] {
  const first = startOfMonth(d);
  const start = addDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function monthLabel(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function humanDate(iso: string): string {
  const d = fromISO(iso);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** Bidding closes 48h before 00:00 local on the launch day. */
export function closesAt(iso: string): Date {
  return addDays(fromISO(iso), -2);
}

export function biddingOpen(iso: string, now = new Date()): boolean {
  return now.getTime() < closesAt(iso).getTime();
}

export function daysBetween(aIso: string, bIso: string): number {
  const a = fromISO(aIso).getTime();
  const b = fromISO(bIso).getTime();
  return Math.round((b - a) / 86400000);
}
