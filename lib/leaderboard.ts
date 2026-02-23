import type { HoldingEntry } from "@prisma/client";

import { TOP_LIMIT } from "@/lib/constants";
import type {
  LeaderboardEntry,
  LeaderboardStats,
  MyRankResult,
  RankedLeaderboardEntry
} from "@/lib/types";

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : Number(value);
}

export function serializeEntry(entry: HoldingEntry): LeaderboardEntry {
  return {
    id: entry.id,
    usernameDisplay: entry.usernameDisplay,
    usernameKey: entry.usernameKey,
    lots: entry.lots,
    avgPrice: toNumber(entry.avgPrice),
    totalNominal: toNumber(entry.totalNominal),
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString()
  };
}

export function compareByLeaderboardRule(
  a: LeaderboardEntry,
  b: LeaderboardEntry
): number {
  if (a.lots !== b.lots) {
    return b.lots - a.lots;
  }

  if (a.totalNominal !== b.totalNominal) {
    return b.totalNominal - a.totalNominal;
  }

  return a.usernameKey.localeCompare(b.usernameKey);
}

export function rankEntries(entries: LeaderboardEntry[]): RankedLeaderboardEntry[] {
  const sorted = [...entries].sort(compareByLeaderboardRule);

  return sorted.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
}

export function buildStats(entries: LeaderboardEntry[]): LeaderboardStats {
  const holdersCount = entries.length;

  const totalLots = entries.reduce((total, entry) => total + entry.lots, 0);
  const totalAvg = entries.reduce((total, entry) => total + entry.avgPrice, 0);
  const totalNominal = entries.reduce((total, entry) => total + entry.totalNominal, 0);

  return {
    holdersCount,
    totalLots,
    meanAvgPrice: holdersCount > 0 ? Number((totalAvg / holdersCount).toFixed(2)) : 0,
    totalNominal: Number(totalNominal.toFixed(2))
  };
}

export function buildLeaderboard(entries: HoldingEntry[]) {
  const normalizedEntries = entries.map(serializeEntry);
  const ranked = rankEntries(normalizedEntries);

  return {
    stats: buildStats(normalizedEntries),
    top10: ranked.slice(0, TOP_LIMIT),
    hiddenCount: Math.max(ranked.length - TOP_LIMIT, 0),
    ranked
  };
}

export function findMyRank(
  ranked: RankedLeaderboardEntry[],
  usernameKey: string
): MyRankResult | undefined {
  const found = ranked.find((entry) => entry.usernameKey === usernameKey);

  if (!found) {
    return undefined;
  }

  return {
    rank: found.rank,
    entry: {
      id: found.id,
      usernameDisplay: found.usernameDisplay,
      usernameKey: found.usernameKey,
      lots: found.lots,
      avgPrice: found.avgPrice,
      totalNominal: found.totalNominal,
      createdAt: found.createdAt,
      updatedAt: found.updatedAt
    }
  };
}
