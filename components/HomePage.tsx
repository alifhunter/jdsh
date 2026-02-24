"use client";

import { useCallback, useEffect, useState } from "react";

import { CheckMyRankForm } from "@/components/CheckMyRankForm";
import { EmptyLeaderboardState } from "@/components/EmptyLeaderboardState";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { MyPositionCard } from "@/components/MyPositionCard";
import { SubmitForm } from "@/components/SubmitForm";
import { SummaryCards } from "@/components/SummaryCards";
import { Toast } from "@/components/Toast";
import { EMITEN_EXCHANGE, EMITEN_NAME } from "@/lib/constants";
import { formatInteger, formatRupiah } from "@/lib/format";
import type {
  ApiErrorResponse,
  LeaderboardResponse,
  MyRankResult,
  PostEntryResponse
} from "@/lib/types";

export function HomePage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myPosition, setMyPosition] = useState<MyRankResult | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeActionTab, setActiveActionTab] = useState<"submit" | "check">("submit");

  const loadLeaderboard = useCallback(async (username?: string) => {
    const search = username ? `?username=${encodeURIComponent(username)}` : "";

    const response = await fetch(`/api/leaderboard${search}`, {
      cache: "no-store"
    });

    const payload = (await response.json()) as LeaderboardResponse | ApiErrorResponse;

    if (!response.ok) {
      throw new Error((payload as ApiErrorResponse).error || "Gagal mengambil leaderboard.");
    }

    const leaderboardPayload = payload as LeaderboardResponse;

    setData(leaderboardPayload);
    return leaderboardPayload;
  }, []);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        await loadLeaderboard();
      } catch (loadError) {
        if (active) {
          const message = loadError instanceof Error ? loadError.message : "Gagal memuat data.";
          setError(message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadLeaderboard]);

  const handleCreated = async (payload: PostEntryResponse) => {
    setToast("Entry berhasil disimpan.");
    setActiveActionTab("submit");
    setMyPosition({
      rank: payload.rank,
      entry: payload.entry
    });

    try {
      const refreshed = await loadLeaderboard(payload.entry.usernameDisplay);
      if (refreshed.myRank) {
        setMyPosition(refreshed.myRank);
      }
      setError(null);
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "Gagal refresh data.";
      setError(message);
    }
  };

  const handleCheckMyRank = useCallback(
    async (username: string) => {
      const refreshed = await loadLeaderboard(username);
      setError(null);

      if (refreshed.myRank) {
        setMyPosition(refreshed.myRank);
        return refreshed.myRank;
      }

      setMyPosition(null);
      return null;
    },
    [loadLeaderboard]
  );

  const isEmptyLeaderboard = data ? data.stats.holdersCount === 0 : false;
  const marketQuoteUrl =
    data?.market.quoteUrl ??
    `https://www.google.com/finance/quote/${encodeURIComponent(`${EMITEN_NAME}:${EMITEN_EXCHANGE}`)}`;

  return (
    <main className="min-h-screen px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-brand-100 bg-white/80 p-6 shadow-card backdrop-blur sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
                Pesona Kabel Cabul
              </p>
              <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
                Leaderboard Holder {EMITEN_NAME}
              </h1>
              <p className="mt-2 text-sm text-slate-600">iseng iseng aja xixi.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Harga Terakhir {EMITEN_NAME}
              </p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {data?.market.price !== null && data?.market.price !== undefined
                  ? formatRupiah(data.market.price)
                  : "N/A"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {data?.market.asOf ? `${data.market.asOf} · ${data.market.exchange}` : "Belum tersedia"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Sumber:{" "}
                <a
                  href={marketQuoteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 hover:underline"
                >
                  {data?.market.source === "google-finance" ? "Google Finance" : "Unavailable"}
                </a>
              </p>
            </div>
          </div>
        </header>

        {data && (
          <section className="relative mt-4 overflow-hidden rounded-3xl border border-red-500/40 bg-gradient-to-br from-red-700 via-red-950 to-black p-5 text-white shadow-[0_30px_70px_-35px_rgba(239,68,68,0.95)] sm:p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-red-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 left-16 h-32 w-32 rounded-full bg-red-300/10 blur-3xl" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0)_32%,rgba(255,255,255,0.09)_68%,rgba(255,255,255,0)_100%)]" />

            <div className="relative z-10 flex flex-col gap-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-red-100/90">
                Highlight - Total Nominal Loss
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                {data.lossHighlight.totalNominalLoss === null
                  ? "N/A"
                  : formatRupiah(data.lossHighlight.totalNominalLoss)}
              </p>
              <p className="text-xs text-red-100/85">
                {data.lossHighlight.totalNominalLoss === null
                  ? "Belum bisa dihitung karena harga saat ini belum tersedia."
                  : `Akumulasi ${formatInteger(data.lossHighlight.losingHoldersCount)} holder rugi dari seluruh entry.`}
              </p>
            </div>
          </section>
        )}

        <div className="mt-6 space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {isLoading && !data ? (
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-6 text-sm text-slate-600 shadow-card">
              Memuat leaderboard...
            </div>
          ) : null}

          {data ? (
            <>
              <SummaryCards stats={data.stats} />

              <section className="grid gap-6 lg:grid-cols-[1.55fr_1fr]">
                <div>
                  {isEmptyLeaderboard ? (
                    <EmptyLeaderboardState />
                  ) : (
                    <LeaderboardTable
                      top10={data.top10}
                      top10LosersByPercentage={data.top10LosersByPercentage}
                      top10LosersByAmount={data.top10LosersByAmount}
                      currentPrice={data.market.price}
                      hiddenCount={data.hiddenCount}
                    />
                  )}
                </div>

                <div className="space-y-6">
                  <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setActiveActionTab("submit")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        activeActionTab === "submit"
                          ? "bg-white text-brand-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Submit Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveActionTab("check")}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        activeActionTab === "check"
                          ? "bg-white text-brand-700 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Check My Rank
                    </button>
                  </div>

                  {activeActionTab === "submit" ? (
                    <SubmitForm onCreated={handleCreated} />
                  ) : (
                    <CheckMyRankForm onCheck={handleCheckMyRank} />
                  )}

                  {myPosition && <MyPositionCard myPosition={myPosition} />}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </main>
  );
}
