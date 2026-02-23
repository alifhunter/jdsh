import { formatDecimal, formatInteger, formatRupiah } from "@/lib/format";
import type { LeaderboardStats } from "@/lib/types";

type SummaryCardsProps = {
  stats: LeaderboardStats;
};

const cardStyle =
  "rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card backdrop-blur-sm";

export function SummaryCards({ stats }: SummaryCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article className={cardStyle}>
        <p className="text-sm font-medium text-slate-500">Total holders</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{formatInteger(stats.holdersCount)}</p>
      </article>

      <article className={cardStyle}>
        <p className="text-sm font-medium text-slate-500">Total lots</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{formatInteger(stats.totalLots)}</p>
      </article>

      <article className={cardStyle}>
        <p className="text-sm font-medium text-slate-500">Rata-rata average</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{formatDecimal(stats.meanAvgPrice)}</p>
      </article>

      <article className={cardStyle}>
        <p className="text-sm font-medium text-slate-500">Total nominal</p>
        <p className="mt-2 text-2xl font-semibold text-ink">{formatRupiah(stats.totalNominal)}</p>
      </article>
    </section>
  );
}
