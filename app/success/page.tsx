import { Suspense } from "react";
import type { Metadata } from "next";
import SuccessClient from "./SuccessClient";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bid confirmed",
  robots: { index: false, follow: false },
};

export default function SuccessPage() {
  return (
    <main className="min-h-[100dvh]">
      <PageHeader />
      <Suspense fallback={<div className="p-8 text-center t-faint">Loading…</div>}>
        <SuccessClient />
      </Suspense>
    </main>
  );
}
