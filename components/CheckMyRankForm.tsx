"use client";

import { type FormEvent, useState } from "react";

import { MAX_USERNAME_LENGTH } from "@/lib/constants";
import { USERNAME_REGEX } from "@/lib/schemas";
import type { MyRankResult } from "@/lib/types";

type CheckMyRankFormProps = {
  onCheck: (username: string) => Promise<MyRankResult | null>;
};

const inputClassName =
  "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

export function CheckMyRankForm({ onCheck }: CheckMyRankFormProps) {
  const [username, setUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResultMessage(null);

    const normalized = username.trim();

    if (!normalized) {
      setError("Username wajib diisi");
      return;
    }

    if (normalized.length > MAX_USERNAME_LENGTH) {
      setError(`Maksimal ${MAX_USERNAME_LENGTH} karakter`);
      return;
    }

    if (!USERNAME_REGEX.test(normalized)) {
      setError("Username hanya boleh huruf, angka, underscore (_)");
      return;
    }

    try {
      setIsChecking(true);
      const rankResult = await onCheck(normalized);

      if (rankResult) {
        setResultMessage(`Ditemukan. Rank kamu sekarang #${rankResult.rank}.`);
      } else {
        setResultMessage("Username belum terdaftar di leaderboard.");
      }
    } catch (checkError) {
      const message = checkError instanceof Error ? checkError.message : "Gagal cek rank.";
      setError(message);
    } finally {
      setIsChecking(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card">
      <h2 className="text-xl font-semibold text-ink">Check My Rank</h2>
      <p className="mt-1 text-sm text-slate-500">
        Masukkan username kamu untuk cek ranking saat ini.
      </p>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="checkUsername" className="text-sm font-medium text-slate-700">
            Username u/
          </label>
          <input
            id="checkUsername"
            type="text"
            autoComplete="off"
            className={inputClassName}
            placeholder="contoh: InvestorMalam"
            value={username}
            maxLength={MAX_USERNAME_LENGTH}
            onChange={(event) => setUsername(event.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </p>
        )}

        {resultMessage && (
          <p className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-medium text-brand-800">
            {resultMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isChecking}
          className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isChecking ? "Checking..." : "Check My Rank"}
        </button>
      </form>
    </section>
  );
}
