"use client";

import { useCallback, useEffect, useState } from "react";

import { EmptyLeaderboardState } from "@/components/EmptyLeaderboardState";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { MyPositionCard } from "@/components/MyPositionCard";
import { SubmitForm } from "@/components/SubmitForm";
import { SummaryCards } from "@/components/SummaryCards";
import { Toast } from "@/components/Toast";
import { EMITEN_NAME } from "@/lib/constants";
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

    if (leaderboardPayload.myRank) {
      setMyPosition(leaderboardPayload.myRank);
    } else if (username) {
      setMyPosition(null);
    }
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
    setMyPosition({
      rank: payload.rank,
      entry: payload.entry
    });

    try {
      await loadLeaderboard(payload.entry.usernameDisplay);
      setError(null);
    } catch (refreshError) {
      const message = refreshError instanceof Error ? refreshError.message : "Gagal refresh data.";
      setError(message);
    }
  };

  const isEmptyLeaderboard = data ? data.stats.holdersCount === 0 : false;

  return (
    <main className="min-h-screen px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-brand-100 bg-white/80 p-6 shadow-card backdrop-blur sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">
            Pesona Kabel Cabul
          </p>
          <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
            Leaderboard Holder {EMITEN_NAME}
          </h1>
          <p className="mt-2 text-sm text-slate-600">iseng iseng aja xixi.</p>
        </header>

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
                    <LeaderboardTable top10={data.top10} hiddenCount={data.hiddenCount} />
                  )}
                </div>

                <div className="space-y-6">
                  <SubmitForm onCreated={handleCreated} />

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
