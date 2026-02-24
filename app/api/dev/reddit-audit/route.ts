import { NextResponse } from "next/server";
import { z } from "zod";

import { MAX_USERNAME_LENGTH } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import {
  checkRedditUserExists,
  type RedditCheckStrategy,
  type RedditUserCheckStatus
} from "@/lib/reddit";
import { USERNAME_REGEX } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 2000;
const CHECK_CONCURRENCY = 4;
const checkStrategySchema = z.enum(["public", "oauth", "auto"]);

const singleActionSchema = z.object({
  action: z.literal("single"),
  checkStrategy: checkStrategySchema.optional().default("public"),
  username: z
    .string()
    .trim()
    .min(1, "Username wajib diisi")
    .max(MAX_USERNAME_LENGTH, `Maksimal ${MAX_USERNAME_LENGTH} karakter`)
    .regex(USERNAME_REGEX, "Format username tidak valid")
});

const bulkActionSchema = z.object({
  action: z.literal("bulk"),
  checkStrategy: checkStrategySchema.optional().default("public"),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional()
});

const cleanActionSchema = z.object({
  action: z.literal("clean"),
  checkStrategy: checkStrategySchema.optional().default("public"),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).optional(),
  includeUnavailable: z.boolean().optional().default(false),
  dryRun: z.boolean().optional().default(true),
  confirmText: z.string().optional()
});

const requestSchema = z.discriminatedUnion("action", [
  singleActionSchema,
  bulkActionSchema,
  cleanActionSchema
]);

type EntryForAudit = {
  id: string;
  usernameDisplay: string;
  usernameKey: string;
};

type AuditedEntry = EntryForAudit & {
  status: RedditUserCheckStatus;
};

function ensureDevelopmentAccess() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return null;
}

function normalizeLimit(limit?: number) {
  if (!limit || Number.isNaN(limit)) {
    return DEFAULT_LIMIT;
  }

  return Math.max(1, Math.min(limit, MAX_LIMIT));
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const result: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runner() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      result[currentIndex] = await worker(items[currentIndex]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, runner));

  return result;
}

function buildSummary(results: AuditedEntry[]) {
  return results.reduce(
    (summary, entry) => {
      summary[entry.status] += 1;
      return summary;
    },
    {
      exists: 0,
      not_found: 0,
      suspended: 0,
      unavailable: 0
    } satisfies Record<RedditUserCheckStatus, number>
  );
}

async function fetchEntriesForAudit(limit: number): Promise<EntryForAudit[]> {
  return prisma.holdingEntry.findMany({
    select: {
      id: true,
      usernameDisplay: true,
      usernameKey: true
    },
    orderBy: {
      createdAt: "asc"
    },
    take: limit
  });
}

async function auditEntries(limit: number, strategy: RedditCheckStrategy): Promise<AuditedEntry[]> {
  const entries = await fetchEntriesForAudit(limit);

  return mapWithConcurrency(entries, CHECK_CONCURRENCY, async (entry) => {
    const status = await checkRedditUserExists(entry.usernameDisplay, {
      strategy
    });
    return {
      ...entry,
      status
    };
  });
}

export async function POST(request: Request) {
  const deniedResponse = ensureDevelopmentAccess();
  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Payload tidak valid.",
          fieldErrors: parsed.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    if (parsed.data.action === "single") {
      const status = await checkRedditUserExists(parsed.data.username, {
        strategy: parsed.data.checkStrategy
      });

      return NextResponse.json(
        {
          action: "single",
          checkStrategy: parsed.data.checkStrategy,
          username: parsed.data.username,
          status
        },
        { status: 200 }
      );
    }

    if (parsed.data.action === "bulk") {
      const limit = normalizeLimit(parsed.data.limit);
      const results = await auditEntries(limit, parsed.data.checkStrategy);
      const summary = buildSummary(results);

      return NextResponse.json(
        {
          action: "bulk",
          checkStrategy: parsed.data.checkStrategy,
          scannedCount: results.length,
          summary,
          results
        },
        { status: 200 }
      );
    }

    const limit = normalizeLimit(parsed.data.limit);
    const results = await auditEntries(limit, parsed.data.checkStrategy);
    const summary = buildSummary(results);
    const candidateStatuses: RedditUserCheckStatus[] = parsed.data.includeUnavailable
      ? ["not_found", "suspended", "unavailable"]
      : ["not_found", "suspended"];

    if (!parsed.data.dryRun && parsed.data.confirmText !== "CLEAN") {
      return NextResponse.json(
        {
          error: "Konfirmasi tidak valid. Ketik CLEAN untuk mengeksekusi clean.",
          fieldErrors: {
            confirmText: ["Konfirmasi tidak valid. Ketik CLEAN untuk mengeksekusi clean."]
          }
        },
        { status: 400 }
      );
    }

    const candidateIds = results
      .filter((entry) => candidateStatuses.includes(entry.status))
      .map((entry) => entry.id);

    if (parsed.data.dryRun) {
      return NextResponse.json(
        {
          action: "clean",
          checkStrategy: parsed.data.checkStrategy,
          dryRun: true,
          scannedCount: results.length,
          summary,
          candidateCount: candidateIds.length,
          candidateStatuses
        },
        { status: 200 }
      );
    }

    if (candidateIds.length === 0) {
      return NextResponse.json(
        {
          action: "clean",
          checkStrategy: parsed.data.checkStrategy,
          dryRun: false,
          scannedCount: results.length,
          summary,
          candidateCount: 0,
          deletedCount: 0,
          candidateStatuses
        },
        { status: 200 }
      );
    }

    const deleted = await prisma.holdingEntry.deleteMany({
      where: {
        id: { in: candidateIds }
      }
    });

    return NextResponse.json(
      {
        action: "clean",
        checkStrategy: parsed.data.checkStrategy,
        dryRun: false,
        scannedCount: results.length,
        summary,
        candidateCount: candidateIds.length,
        deletedCount: deleted.count,
        candidateStatuses
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Payload JSON tidak valid." }, { status: 400 });
    }

    console.error("POST /api/dev/reddit-audit failed", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server." },
      { status: 500 }
    );
  }
}
