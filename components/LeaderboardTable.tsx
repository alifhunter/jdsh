"use client";

import { useMemo, useState } from "react";

import { formatDecimal, formatInteger, formatPercent, formatRupiah } from "@/lib/format";
import type { RankedLeaderboardEntry, TopLoserEntry } from "@/lib/types";

type LeaderboardTableProps = {
  top10: RankedLeaderboardEntry[];
  top10LosersByPercentage: TopLoserEntry[];
  top10LosersByAmount: TopLoserEntry[];
  currentPrice: number | null;
  hiddenCount: number;
};

function getRedditProfileUrl(username: string) {
  return `https://reddit.com/u/${encodeURIComponent(username)}`;
}

export function LeaderboardTable({
  top10,
  top10LosersByPercentage,
  top10LosersByAmount,
  currentPrice,
  hiddenCount
}: LeaderboardTableProps) {
  const [activeTab, setActiveTab] = useState<"holders" | "losers">("holders");
  const [loserSortBy, setLoserSortBy] = useState<"percentage" | "amount">("percentage");

  const holderCountLabel = useMemo(() => {
    if (hiddenCount <= 0) {
      return null;
    }

    return `+${formatInteger(hiddenCount)} holder lainnya`;
  }, [hiddenCount]);

  const top10Losers = useMemo(
    () => (loserSortBy === "percentage" ? top10LosersByPercentage : top10LosersByAmount),
    [loserSortBy, top10LosersByAmount, top10LosersByPercentage]
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">
            {activeTab === "holders" ? "Top 10 Holder" : "Top 10 Loser"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {activeTab === "holders"
              ? "Ranking dihitung dari seluruh entry."
              : loserSortBy === "percentage"
                ? "Loser diurutkan berdasarkan persentase P/L."
                : "Loser diurutkan berdasarkan nominal P/L."}
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("holders")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "holders"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Top 10 Holder
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("losers")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "losers"
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Top 10 Loser
          </button>
        </div>
      </div>

      {activeTab === "losers" && (
        <div className="mt-3 flex items-center justify-end">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            Sort by
            <select
              value={loserSortBy}
              onChange={(event) => setLoserSortBy(event.target.value as "percentage" | "amount")}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none ring-brand-200 transition focus:ring-2"
            >
              <option value="percentage">Percentage</option>
              <option value="amount">Amount</option>
            </select>
          </label>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        {activeTab === "holders" ? (
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
                      {entry.isMasked ? (
                        <span className="select-none text-slate-500 blur-[3px]">{entry.usernameDisplay}</span>
                      ) : (
                        <a
                          href={getRedditProfileUrl(entry.usernameDisplay)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink underline-offset-4 transition hover:text-brand-700 hover:underline"
                        >
                          {entry.usernameDisplay}
                        </a>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{formatInteger(entry.lots)}</td>
                    <td className="py-3 pr-4 text-slate-700">{formatDecimal(entry.avgPrice)}</td>
                    <td className="py-3 font-semibold text-slate-800">{formatRupiah(entry.totalNominal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-3 pr-4 font-semibold">Rank</th>
                <th className="py-3 pr-4 font-semibold">Username</th>
                <th className="py-3 pr-4 font-semibold">Avg</th>
                <th className="py-3 pr-4 font-semibold">Last Price</th>
                <th className="py-3 pr-4 font-semibold">P/L %</th>
                <th className="py-3 font-semibold">P/L Nominal</th>
              </tr>
            </thead>
            <tbody>
              {currentPrice === null ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Harga sekarang belum tersedia, tab loser belum bisa dihitung.
                  </td>
                </tr>
              ) : top10Losers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    Belum ada data loser.
                  </td>
                </tr>
              ) : (
                top10Losers.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 font-semibold text-brand-700">#{entry.lossRank}</td>
                    <td className="py-3 pr-4 font-medium">
                      {entry.isMasked ? (
                        <span className="select-none text-slate-500 blur-[3px]">{entry.usernameDisplay}</span>
                      ) : (
                        <a
                          href={getRedditProfileUrl(entry.usernameDisplay)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink underline-offset-4 transition hover:text-brand-700 hover:underline"
                        >
                          {entry.usernameDisplay}
                        </a>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">{formatDecimal(entry.avgPrice)}</td>
                    <td className="py-3 pr-4 text-slate-700">{formatDecimal(entry.marketPrice)}</td>
                    <td className="py-3 pr-4 font-semibold text-red-600">{formatPercent(entry.pnlPercent)}</td>
                    <td className="py-3 font-semibold text-red-600">{formatRupiah(entry.pnlNominal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-600">Holder lainnya disembunyikan</span>
        {holderCountLabel && (
          <span className="rounded-full bg-brand-100 px-3 py-1 font-semibold text-brand-700">
            {holderCountLabel}
          </span>
        )}
      </div>
    </section>
  );
}
