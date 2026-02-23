import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { buildLeaderboard } from "@/lib/leaderboard";
import { prisma } from "@/lib/prisma";
import { entryInputSchema, normalizeUsername } from "@/lib/schemas";
import type { PostEntryResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parsed = entryInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validasi input gagal.",
          fieldErrors: parsed.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const { usernameDisplay, usernameKey } = normalizeUsername(parsed.data.username);

    const existing = await prisma.holdingEntry.findUnique({
      where: { usernameKey },
      select: { id: true }
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username sudah digunakan, pilih username lain." },
        { status: 409 }
      );
    }

    const saved = await prisma.holdingEntry.create({
      data: {
        usernameDisplay,
        usernameKey,
        lots: parsed.data.lots,
        avgPrice: new Prisma.Decimal(parsed.data.avgPrice),
        totalNominal: new Prisma.Decimal(parsed.data.totalNominal)
      }
    });

    const allEntries = await prisma.holdingEntry.findMany();
    const { ranked } = buildLeaderboard(allEntries);
    const rankedSaved = ranked.find((entry) => entry.id === saved.id);

    if (!rankedSaved) {
      return NextResponse.json(
        { error: "Gagal menghitung rank terbaru." },
        { status: 500 }
      );
    }

    const { rank, ...entry } = rankedSaved;

    const response: PostEntryResponse = {
      entry,
      rank
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Username sudah digunakan, pilih username lain." },
        { status: 409 }
      );
    }

    console.error("POST /api/entry failed", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
