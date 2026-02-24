"use client";

import { useMemo, useState } from "react";

type RedditUserCheckStatus = "exists" | "not_found" | "suspended" | "unavailable";
type RedditCheckStrategy = "oauth" | "public" | "auto";

type AuditSummary = {
  exists: number;
  not_found: number;
  suspended: number;
  unavailable: number;
};

type AuditedEntry = {
  id: string;
  usernameDisplay: string;
  usernameKey: string;
  status: RedditUserCheckStatus;
};

type SingleCheckResponse = {
  action: "single";
  checkStrategy: RedditCheckStrategy;
  username: string;
  status: RedditUserCheckStatus;
};

type BulkResponse = {
  action: "bulk";
  checkStrategy: RedditCheckStrategy;
  scannedCount: number;
  summary: AuditSummary;
  results: AuditedEntry[];
};

type CleanResponse = {
  action: "clean";
  checkStrategy: RedditCheckStrategy;
  dryRun: boolean;
  scannedCount: number;
  summary: AuditSummary;
  candidateCount: number;
  deletedCount?: number;
  candidateStatuses: RedditUserCheckStatus[];
};

type ErrorResponse = {
  error: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

function statusLabel(status: RedditUserCheckStatus) {
  if (status === "exists") {
    return "Exists";
  }

  if (status === "not_found") {
    return "Not Found";
  }

  if (status === "suspended") {
    return "Suspended";
  }

  return "Unavailable";
}

function statusClass(status: RedditUserCheckStatus) {
  if (status === "exists") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "not_found") {
    return "bg-amber-100 text-amber-700";
  }

  if (status === "suspended") {
    return "bg-rose-100 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

async function postAudit<TPayload extends object, TSuccess>(payload: TPayload): Promise<TSuccess> {
  const response = await fetch("/api/dev/reddit-audit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  const json = (await response.json()) as TSuccess | ErrorResponse;

  if (!response.ok) {
    throw new Error((json as ErrorResponse).error || "Request gagal.");
  }

  return json as TSuccess;
}

export function RedditAuditPanel() {
  const [checkStrategy, setCheckStrategy] = useState<RedditCheckStrategy>("public");
  const [singleUsername, setSingleUsername] = useState("");
  const [singleResult, setSingleResult] = useState<SingleCheckResponse | null>(null);
  const [singleError, setSingleError] = useState<string | null>(null);
  const [isSingleLoading, setIsSingleLoading] = useState(false);

  const [bulkLimit, setBulkLimit] = useState("100");
  const [bulkResult, setBulkResult] = useState<BulkResponse | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  const [includeUnavailable, setIncludeUnavailable] = useState(false);
  const [cleanPreview, setCleanPreview] = useState<CleanResponse | null>(null);
  const [cleanResult, setCleanResult] = useState<CleanResponse | null>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [isCleanLoading, setIsCleanLoading] = useState(false);

  const safeLimit = useMemo(() => {
    const parsed = Number.parseInt(bulkLimit, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 100;
    }

    return parsed;
  }, [bulkLimit]);

  const handleSingleCheck = async () => {
    const username = singleUsername.trim();
    if (!username) {
      setSingleError("Username wajib diisi.");
      return;
    }

    setIsSingleLoading(true);
    setSingleError(null);
    setSingleResult(null);

    try {
      const data = await postAudit<
        {
          action: "single";
          checkStrategy: RedditCheckStrategy;
          username: string;
        },
        SingleCheckResponse
      >({
        action: "single",
        checkStrategy,
        username
      });

      setSingleResult(data);
    } catch (error) {
      setSingleError(error instanceof Error ? error.message : "Gagal cek username.");
    } finally {
      setIsSingleLoading(false);
    }
  };

  const handleBulkAudit = async () => {
    setIsBulkLoading(true);
    setBulkError(null);
    setBulkResult(null);
    setCleanPreview(null);
    setCleanResult(null);
    setCleanError(null);

    try {
      const data = await postAudit<
        {
          action: "bulk";
          checkStrategy: RedditCheckStrategy;
          limit: number;
        },
        BulkResponse
      >({
        action: "bulk",
        checkStrategy,
        limit: safeLimit
      });

      setBulkResult(data);
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Gagal melakukan bulk audit.");
    } finally {
      setIsBulkLoading(false);
    }
  };

  const handleClean = async (dryRun: boolean) => {
    setIsCleanLoading(true);
    setCleanError(null);
    if (dryRun) {
      setCleanPreview(null);
      setCleanResult(null);
    } else {
      setCleanResult(null);
    }

    try {
      const data = await postAudit<
        {
          action: "clean";
          checkStrategy: RedditCheckStrategy;
          limit: number;
          includeUnavailable: boolean;
          dryRun: boolean;
          confirmText?: string;
        },
        CleanResponse
      >({
        action: "clean",
        checkStrategy,
        limit: safeLimit,
        includeUnavailable,
        dryRun,
        confirmText: dryRun ? undefined : confirmText
      });

      if (dryRun) {
        setCleanPreview(data);
      } else {
        setConfirmText("");
        await handleBulkAudit();
        setCleanResult(data);
      }
    } catch (error) {
      setCleanError(error instanceof Error ? error.message : "Gagal menjalankan clean.");
    } finally {
      setIsCleanLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-ink">Single Username Check</h2>
          <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
            Check Method
            <select
              value={checkStrategy}
              onChange={(event) => setCheckStrategy(event.target.value as RedditCheckStrategy)}
              className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-slate-700 outline-none ring-brand-200 transition focus:ring-2"
            >
              <option value="oauth">OAuth</option>
              <option value="auto">Auto</option>
              <option value="public">Public</option>
            </select>
          </label>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Cek satu username Reddit untuk melihat status akun saat ini.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Mode <span className="font-semibold">OAuth</span> memakai app credentials di server dan tidak meminta login
          user.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={singleUsername}
            onChange={(event) => setSingleUsername(event.target.value)}
            placeholder="contoh: spez"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-200 transition focus:ring-2"
          />
          <button
            type="button"
            onClick={handleSingleCheck}
            disabled={isSingleLoading}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSingleLoading ? "Checking..." : "Check"}
          </button>
        </div>

        {singleError && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {singleError}
          </div>
        )}

        {singleResult && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-semibold text-slate-800">{singleResult.username}</span>
            <span className="ml-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              [{singleResult.checkStrategy}]
            </span>
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(singleResult.status)}`}>
              {statusLabel(singleResult.status)}
            </span>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card">
        <h2 className="text-xl font-semibold text-ink">Bulk Audit + Clean</h2>
        <p className="mt-1 text-sm text-slate-500">
          Scan data holder dari database, lalu hapus akun invalid dengan konfirmasi.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Current check method:{" "}
          <span className="font-semibold uppercase tracking-[0.06em] text-slate-700">{checkStrategy}</span>
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="text-sm font-semibold text-slate-700">
            Scan limit
            <input
              value={bulkLimit}
              onChange={(event) => setBulkLimit(event.target.value)}
              inputMode="numeric"
              className="mt-1 block w-36 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-200 transition focus:ring-2"
            />
          </label>

          <button
            type="button"
            onClick={handleBulkAudit}
            disabled={isBulkLoading}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isBulkLoading ? "Auditing..." : "Run Bulk Audit"}
          </button>
        </div>

        {bulkError && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {bulkError}
          </div>
        )}

        {bulkResult && (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-emerald-700">Exists</p>
                <p className="mt-1 text-xl font-bold text-emerald-800">{bulkResult.summary.exists}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-amber-700">Not Found</p>
                <p className="mt-1 text-xl font-bold text-amber-800">{bulkResult.summary.not_found}</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-rose-700">Suspended</p>
                <p className="mt-1 text-xl font-bold text-rose-800">{bulkResult.summary.suspended}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-slate-600">Unavailable</p>
                <p className="mt-1 text-xl font-bold text-slate-700">{bulkResult.summary.unavailable}</p>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-600">Total scanned: {bulkResult.scannedCount}</p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-800">Clean Invalid Entries</h3>
              <p className="mt-1 text-xs text-slate-600">
                Default clean hanya `not_found` dan `suspended`. Gunakan dry-run sebelum execute.
              </p>

              <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={includeUnavailable}
                  onChange={(event) => setIncludeUnavailable(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Include `unavailable` (berisiko false positive)
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleClean(true)}
                  disabled={isCleanLoading}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isCleanLoading ? "Processing..." : "Dry Run Clean"}
                </button>
              </div>

              {cleanPreview && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  Candidate to clean: <span className="font-semibold">{cleanPreview.candidateCount}</span>
                </div>
              )}

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={confirmText}
                  onChange={(event) => setConfirmText(event.target.value)}
                  placeholder="Ketik CLEAN untuk execute"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-brand-200 transition focus:ring-2 sm:max-w-xs"
                />
                <button
                  type="button"
                  onClick={() => handleClean(false)}
                  disabled={isCleanLoading || confirmText !== "CLEAN"}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Execute Clean
                </button>
              </div>

              {cleanError && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {cleanError}
                </div>
              )}

              {cleanResult && !cleanResult.dryRun && (
                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Deleted rows: <span className="font-semibold">{cleanResult.deletedCount ?? 0}</span>
                </div>
              )}
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full bg-white text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Username</th>
                    <th className="px-3 py-2 font-semibold">Username Key</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkResult.results.map((entry) => (
                    <tr key={entry.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">{entry.usernameDisplay}</td>
                      <td className="px-3 py-2 text-slate-600">{entry.usernameKey}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(entry.status)}`}>
                          {statusLabel(entry.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
