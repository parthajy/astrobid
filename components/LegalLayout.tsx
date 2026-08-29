import PageHeader from "@/components/PageHeader";
import SiteFooter from "@/components/SiteFooter";

export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-[100dvh]">
      <PageHeader />
      <article className="mx-auto max-w-3xl px-4 pb-4">
        <h1 className="text-2xl font-extrabold t-ink sm:text-3xl">{title}</h1>
        <p className="mt-1 text-xs t-faint">Last updated: {updated}</p>
        <div className="legal mt-6">{children}</div>
      </article>
      <SiteFooter />
    </main>
  );
}
