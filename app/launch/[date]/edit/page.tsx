import { Suspense } from "react";
import { notFound } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import EditForm from "./EditForm";

export const dynamic = "force-dynamic";

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function EditLaunchPage({ params }: { params: { date: string } }) {
  if (!ISO_RE.test(params.date)) notFound();
  return (
    <main className="min-h-[100dvh] pb-16">
      <PageHeader />
      <Suspense fallback={<div className="p-8 text-center text-white/40">Loading…</div>}>
        <EditForm date={params.date} />
      </Suspense>
    </main>
  );
}
