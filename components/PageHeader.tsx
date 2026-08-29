import Link from "next/link";

export default function PageHeader({ active }: { active?: "stats" | "archive" }) {
  const link = (isActive: boolean) =>
    isActive ? "t-ink font-semibold" : "t-muted hover:underline";

  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
      <Link href="/" className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="AstroBid" className="h-8 w-8" />
        <span className="text-xl font-extrabold tracking-tight t-ink">AstroBid</span>
      </Link>
      <nav className="flex items-center gap-4 text-sm">
        <Link href="/" className="t-muted hover:underline">
          Calendar
        </Link>
        <Link href="/stats" className={link(active === "stats")}>
          Stats
        </Link>
        <Link href="/archive" className={link(active === "archive")}>
          Archive
        </Link>
      </nav>
    </header>
  );
}
