"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import {
  MAX_LOTS,
  MAX_MONEY_VALUE,
  NOMINAL_WARNING_TOLERANCE_RATIO
} from "@/lib/constants";
import { entryInputSchema, type EntryInput } from "@/lib/schemas";
import type { ApiErrorResponse, PostEntryResponse } from "@/lib/types";

type SubmitFormProps = {
  onCreated: (payload: PostEntryResponse) => Promise<void> | void;
};

const inputClassName =
  "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100";

export function SubmitForm({ onCreated }: SubmitFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<EntryInput>({
    resolver: zodResolver(entryInputSchema),
    mode: "onChange"
  });

  const lots = watch("lots");
  const avgPrice = watch("avgPrice");
  const totalNominal = watch("totalNominal");

  const nominalWarning = useMemo(() => {
    if (
      typeof lots !== "number" ||
      typeof avgPrice !== "number" ||
      typeof totalNominal !== "number" ||
      lots <= 0 ||
      avgPrice < 0
    ) {
      return null;
    }

    const expectedNominal = lots * 100 * avgPrice;

    if (expectedNominal <= 0) {
      return null;
    }

    const ratio = Math.abs(totalNominal - expectedNominal) / expectedNominal;

    if (ratio > NOMINAL_WARNING_TOLERANCE_RATIO) {
      return "Nominal terlihat tidak konsisten, cek kembali.";
    }

    return null;
  }, [lots, avgPrice, totalNominal]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);

    const response = await fetch("/api/entry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    const payload = (await response.json()) as PostEntryResponse | ApiErrorResponse;

    if (!response.ok) {
      const maybeFieldErrors = (payload as ApiErrorResponse).fieldErrors;
      if (maybeFieldErrors) {
        for (const [fieldName, messages] of Object.entries(maybeFieldErrors)) {
          if (messages?.[0]) {
            setError(fieldName as keyof EntryInput, {
              message: messages[0]
            });
          }
        }
      }

      setSubmitError((payload as ApiErrorResponse).error || "Gagal menyimpan entry.");
      return;
    }

    await onCreated(payload as PostEntryResponse);
    reset();
  });

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-card">
      <h2 className="text-xl font-semibold text-ink">Submit Entry</h2>
      {/* <p className="mt-1 text-sm text-slate-500">
        Username unik, valid: huruf/angka/underscore, maksimal 20 karakter.
      </p> */}

      <form className="mt-4 space-y-4" onSubmit={onSubmit} noValidate>
        <div>
          <label htmlFor="username" className="text-sm font-medium text-slate-700">
            Username u/
          </label>
          <input
            id="username"
            type="text"
            autoComplete="off"
            className={inputClassName}
            placeholder="contoh: InvestorMalam"
            {...register("username")}
          />
          {errors.username && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="lots" className="text-sm font-medium text-slate-700">
            Lots
          </label>
          <input
            id="lots"
            type="number"
            min={1}
            max={MAX_LOTS}
            className={inputClassName}
            placeholder="1000"
            {...register("lots", { valueAsNumber: true })}
          />
          {errors.lots && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.lots.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="avgPrice" className="text-sm font-medium text-slate-700">
            Average / Avg Price
          </label>
          <input
            id="avgPrice"
            type="number"
            min={0}
            step="0.01"
            max={MAX_MONEY_VALUE}
            className={inputClassName}
            placeholder="9800"
            {...register("avgPrice", { valueAsNumber: true })}
          />
          {errors.avgPrice && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.avgPrice.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="totalNominal" className="text-sm font-medium text-slate-700">
            Total Nominal
          </label>
          <input
            id="totalNominal"
            type="number"
            min={0}
            step="0.01"
            max={MAX_MONEY_VALUE}
            className={inputClassName}
            placeholder="980000000"
            {...register("totalNominal", { valueAsNumber: true })}
          />
          {errors.totalNominal && (
            <p className="mt-1 text-xs font-medium text-red-600">{errors.totalNominal.message}</p>
          )}
        </div>

        {nominalWarning && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
            {nominalWarning}
          </p>
        )}

        {submitError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Menyimpan..." : "Submit Entry"}
        </button>
      </form>
    </section>
  );
}
