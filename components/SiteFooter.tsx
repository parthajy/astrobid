import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 max-w-5xl border-t border-cosmos-border px-4 py-6 text-xs t-faint">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="t-muted">AstroBid</span>
        <Link href="/moderation" className="hover:underline">
          Listing &amp; content policy
        </Link>
        <Link href="/terms" className="hover:underline">
          Terms
        </Link>
        <Link href="/privacy" className="hover:underline">
          Privacy
        </Link>
        <Link href="/refunds" className="hover:underline">
          Refunds
        </Link>
        <a href="mailto:support@astrobid.lol" className="hover:underline">
          support@astrobid.lol
        </a>
      </div>
    </footer>
  );
}
