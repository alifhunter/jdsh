import { formatDecimal, formatInteger, formatRupiah } from "@/lib/format";
import type { RankedLeaderboardEntry } from "@/lib/types";

type LeaderboardTableProps = {
  top10: RankedLeaderboardEntry[];
  hiddenCount: number;
};

function getRedditProfileUrl(username: string) {
  return `https://reddit.com/u/${encodeURIComponent(username)}`;
}

export function LeaderboardTable({ top10, hiddenCount }: LeaderboardTableProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card">
      <h2 className="text-xl font-semibold text-ink">Top 10 Holder</h2>
      <p className="mt-1 text-sm text-slate-500">Ranking dihitung dari seluruh entry.</p>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="py-3 pr-4 font-semibold">Rank</th>
              <th className="py-3 pr-4 font-semibold">Username</th>
              <th className="py-3 pr-4 font-semibold">Lots</th>
              <th className="py-3 pr-4 font-semibold">Avg</th>
              <th className="py-3 font-semibold">Total Nominal</th>
            </tr>
          </thead>
          <tbody>
            {top10.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  Belum ada data holder.
                </td>
              </tr>
            ) : (
              top10.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 font-semibold text-brand-700">#{entry.rank}</td>
                  <td className="py-3 pr-4 font-medium">
                    <a
                      href={getRedditProfileUrl(entry.usernameDisplay)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-ink underline-offset-4 transition hover:text-brand-700 hover:underline"
                    >
                      {entry.usernameDisplay}
                    </a>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{formatInteger(entry.lots)}</td>
                  <td className="py-3 pr-4 text-slate-700">{formatDecimal(entry.avgPrice)}</td>
                  <td className="py-3 font-semibold text-slate-800">
                    {formatRupiah(entry.totalNominal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-600">Holder lainnya disembunyikan</span>
        {hiddenCount > 0 && (
          <span className="rounded-full bg-brand-100 px-3 py-1 font-semibold text-brand-700">
            +{formatInteger(hiddenCount)} holder lainnya
          </span>
        )}
      </div>
    </section>
  );
}
