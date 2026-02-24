import { notFound } from "next/navigation";

import { RedditAuditPanel } from "@/components/RedditAuditPanel";

export const dynamic = "force-dynamic";

export default function RedditAuditPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return (
    <main className="min-h-screen px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
            Development Only
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink">Reddit Username Audit Tool</h1>
          <p className="mt-2 text-sm text-slate-700">
            Tool untuk validasi username Reddit dan cleanup data holder invalid di local environment.
          </p>
        </header>

        <RedditAuditPanel />
      </div>
    </main>
  );
}
