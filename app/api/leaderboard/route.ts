import { NextRequest, NextResponse } from "next/server";

import { buildLeaderboard, findMyRank } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { normalizeUsername, USERNAME_REGEX } from "@/lib/schemas";
import type { LeaderboardResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

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

    const response: LeaderboardResponse = {
      stats,
      top10,
      hiddenCount
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
