import Link from "next/link";

export default function PageHeader({ active }: { active?: "stats" | "archive" }) {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
      <Link href="/" className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="AstroBid" className="h-8 w-8" />
        <span className="text-xl font-extrabold tracking-tight glow">AstroBid</span>
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        <Link
          href="/"
          className="text-violet-200/70 hover:text-white"
        >
          Calendar
        </Link>
        <Link
          href="/stats"
          className={active === "stats" ? "text-white glow-soft" : "text-violet-200/70 hover:text-white"}
        >
          Stats
        </Link>
        <Link
          href="/archive"
          className={active === "archive" ? "text-white glow-soft" : "text-violet-200/70 hover:text-white"}
        >
          Archive
        </Link>
      </nav>
    </header>
  );
}
