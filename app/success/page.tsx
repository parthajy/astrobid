import { Suspense } from "react";
import SuccessClient from "./SuccessClient";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default function SuccessPage() {
  return (
    <main className="min-h-[100dvh]">
      <PageHeader />
      <Suspense fallback={<div className="p-8 text-center text-white/40">Loading…</div>}>
        <SuccessClient />
      </Suspense>
    </main>
  );
}
