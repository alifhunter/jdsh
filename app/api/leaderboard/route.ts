import { NextRequest, NextResponse } from "next/server";

import { EMITEN_NAME } from "@/lib/constants";
import { buildLeaderboard, buildTopLosers, findMyRank } from "@/lib/leaderboard";
import { getLatestEmitenPrice } from "@/lib/market";
import { prisma } from "@/lib/prisma";
import { normalizeUsername, USERNAME_REGEX } from "@/lib/schemas";
import type { LeaderboardResponse, RankedLeaderboardEntry, TopLoserEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

function maskRankedEntry(entry: RankedLeaderboardEntry): RankedLeaderboardEntry {
  return {
    ...entry,
    usernameDisplay: "blurred_user",
    usernameKey: `blurred-${entry.rank}`,
    isBlurred: true,
    isMasked: true,
    lots: entry.lots,
    avgPrice: entry.avgPrice,
    totalNominal: entry.totalNominal
  };
}

function maskLoserEntry(entry: TopLoserEntry): TopLoserEntry {
  return {
    ...entry,
    usernameDisplay: "blurred_user",
    usernameKey: `blurred-loss-${entry.lossRank}`,
    isBlurred: true,
    isMasked: true,
    lots: entry.lots,
    avgPrice: entry.avgPrice,
    totalNominal: entry.totalNominal,
    pnlPercent: entry.pnlPercent,
    pnlNominal: entry.pnlNominal
  };
}

export async function GET(request: NextRequest) {
  try {
    const usernameParam = request.nextUrl.searchParams.get("username");

    let usernameKey: string | undefined;

    if (usernameParam && usernameParam.trim().length > 0) {
      const normalized = normalizeUsername(usernameParam);

      if (!USERNAME_REGEX.test(normalized.usernameDisplay)) {
        return NextResponse.json(
          { error: "Format username tidak valid." },
          { status: 400 }
        );
      }

      usernameKey = normalized.usernameKey;
    }

    const entries = await prisma.holdingEntry.findMany();
    const { stats, top10, hiddenCount, ranked } = buildLeaderboard(entries);
    const market = await getLatestEmitenPrice(EMITEN_NAME);
    const top10LosersByPercentage =
      market.price !== null ? buildTopLosers(ranked, market.price, "percentage") : [];
    const top10LosersByAmount =
      market.price !== null ? buildTopLosers(ranked, market.price, "amount") : [];

    const response: LeaderboardResponse = {
      stats,
      top10: top10.map(maskRankedEntry),
      top10LosersByPercentage: top10LosersByPercentage.map(maskLoserEntry),
      top10LosersByAmount: top10LosersByAmount.map(maskLoserEntry),
      hiddenCount,
      market
    };

    if (usernameKey) {
      const myRank = findMyRank(ranked, usernameKey);
      if (myRank) {
        response.myRank = myRank;
      }
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("GET /api/leaderboard failed", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
