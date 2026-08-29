// First-pass automated screen for listing text. High-precision phrases only —
// grey-area cases are left to human review (see /moderation).

const BLOCKLIST: string[] = [
  "child porn",
  "child pornography",
  "cp video",
  "loli",
  "buy cocaine",
  "buy heroin",
  "buy meth",
  "buy mdma",
  "buy lsd",
  "weed for sale",
  "drugs for sale",
  "counterfeit",
  "fake passport",
  "fake id for sale",
  "stolen credit card",
  "credit card dump",
  "cvv shop",
  "carding",
  "fullz",
  "ssn for sale",
  "hitman",
  "hire a killer",
  "ddos for hire",
  "botnet for sale",
  "ransomware kit",
  "escort service",
  "escorts near",
  "onlyfans leak",
  "nude leak",
  "ponzi",
  "pyramid scheme",
  "guaranteed returns",
  "get rich quick",
  "double your bitcoin",
  "pump and dump",
];

/** Returns the matched forbidden phrase, or null if the text is clean. */
export function screenListing(...parts: (string | null | undefined)[]): string | null {
  const hay = parts
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase()
    .replace(/\s+/g, " ");
  for (const phrase of BLOCKLIST) {
    if (hay.includes(phrase)) return phrase;
  }
  return null;
}

export const MODERATION_BLOCK_MESSAGE =
  "This listing was blocked by our content policy (see /moderation). If you believe this is a mistake, email pbdomains01@gmail.com.";
