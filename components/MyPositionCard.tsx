import { formatDecimal, formatInteger, formatRupiah } from "@/lib/format";
import type { MyRankResult } from "@/lib/types";

type MyPositionCardProps = {
  myPosition: MyRankResult;
};

export function MyPositionCard({ myPosition }: MyPositionCardProps) {
  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50 p-5 shadow-card">
      <h2 className="text-lg font-semibold text-brand-900">Posisimu</h2>
      <p className="mt-1 text-sm text-brand-700">Rank dihitung dari seluruh holder.</p>

      <div className="mt-4 space-y-2 text-sm text-brand-900">
        <p>
          <span className="font-semibold">Rank:</span> #{myPosition.rank}
        </p>
        <p>
          <span className="font-semibold">Username:</span> {myPosition.entry.usernameDisplay}
        </p>
        <p>
          <span className="font-semibold">Lots:</span> {formatInteger(myPosition.entry.lots)}
        </p>
        <p>
          <span className="font-semibold">Avg:</span> {formatDecimal(myPosition.entry.avgPrice)}
        </p>
        <p>
          <span className="font-semibold">Total Nominal:</span>{" "}
          {formatRupiah(myPosition.entry.totalNominal)}
        </p>
      </div>
    </section>
  );
}
