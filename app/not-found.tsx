import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <div className="text-5xl">🛰️</div>
      <h1 className="mt-4 text-2xl font-extrabold glow">Lost in space</h1>
      <p className="mt-2 text-sm text-white/50">That page drifted out of orbit.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to the calendar
      </Link>
    </main>
  );
}
