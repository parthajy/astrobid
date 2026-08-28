// Currency display. Set NEXT_PUBLIC_CURRENCY (USD, INR, EUR, GBP, …).
// Amounts everywhere in the app are whole units of this currency.

export const CURRENCY = (process.env.NEXT_PUBLIC_CURRENCY || "USD").toUpperCase();

const SYMBOLS: Record<string, string> = {
  USD: "$",
  INR: "₹",
  EUR: "€",
  GBP: "£",
  AUD: "A$",
  CAD: "C$",
  SGD: "S$",
  AED: "AED ",
};

export const CURRENCY_SYMBOL = SYMBOLS[CURRENCY] ?? `${CURRENCY} `;

/** Minor units per major unit (paise, cents, …). */
export const CURRENCY_MINOR = 100;

export function money(n: number): string {
  return `${CURRENCY_SYMBOL}${Math.round(n || 0).toLocaleString("en-US")}`;
}

export function moneyCompact(n: number): string {
  if ((n || 0) >= 1000) {
    const k = n / 1000;
    return `${CURRENCY_SYMBOL}${k.toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  }
  return money(n);
}
