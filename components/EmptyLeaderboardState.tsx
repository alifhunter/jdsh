import { EMITEN_NAME } from "@/lib/constants";

export function EmptyLeaderboardState() {
  return (
    <section className="rounded-2xl border border-dashed border-slate-300 bg-white/95 p-6 shadow-card">
      <h2 className="text-xl font-semibold text-ink">Belum Ada Holder</h2>
      <p className="mt-2 text-sm text-slate-600">
        Leaderboard Holder {EMITEN_NAME} masih kosong. Jadi yang pertama submit posisi kamu.
      </p>
      <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-brand-700">
        Empty State
      </p>
    </section>
  );
}
