import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseBackup } from "@/lib/fitness/utils";
import type { BackupData, SyncLoadResponse, SyncSaveResponse } from "@/lib/fitness/types";

/**
 * Cloud sync for Lean Bulk Studio.
 *
 * A snapshot is the full validated BackupData keyed by a 4–12 char code the
 * user picks (the only "credential" — pick something unguessable). Saving
 * replaces the previous snapshot for that code; loading restores it on any
 * device. Everything is sanitized with the same defensive parser used for
 * backup-file imports, so a tampered payload can never poison app state.
 *
 * Hardening: a per-IP sliding-window rate limiter (in memory, per method)
 * makes brute-forcing codes impractical while staying honest about the
 * single-process deployment this app ships as.
 */

const CODE_RE = /^[A-Z0-9]{4,12}$/;
const MAX_PAYLOAD_CHARS = 2_000_000; // ~2 MB of JSON — real snapshots are <100 KB

/* ----------------------------- Rate limiting ------------------------------- */

const RATE_LIMITS = {
  GET: { windowMs: 60_000, max: 15 }, // restores
  POST: { windowMs: 60_000, max: 10 }, // saves
} as const;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Returns ms to wait before the next allowed request, or 0 if allowed. */
function rateDelay(req: NextRequest, method: "GET" | "POST"): number {
  const { windowMs, max } = RATE_LIMITS[method];
  const key = `${method}:${clientIp(req)}`;
  const now = Date.now();

  // opportunistic cleanup so the map cannot grow without bound
  if (rateBuckets.size > 512) {
    for (const [k, v] of rateBuckets) {
      if (v.resetAt <= now) rateBuckets.delete(k);
    }
  }

  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return 0;
  }
  bucket.count += 1;
  return bucket.count > max ? bucket.resetAt - now : 0;
}

function tooManyRequests(retryAfterMs: number, message: string) {
  const body = { ok: false as const, error: message };
  return NextResponse.json(body, {
    status: 429,
    headers: {
      "Retry-After": String(Math.ceil(retryAfterMs / 1000)),
      "Cache-Control": "no-store",
    },
  });
}

const RATE_MESSAGE =
  "Too many sync requests — wait a minute and try again.";

/* ---------------------------------- Routes --------------------------------- */

export async function GET(req: NextRequest) {
  try {
    const waitMs = rateDelay(req, "GET");
    if (waitMs > 0) {
      return tooManyRequests(waitMs, RATE_MESSAGE);
    }

    const code = (req.nextUrl.searchParams.get("code") ?? "").toUpperCase();
    if (!CODE_RE.test(code)) {
      const body: SyncLoadResponse = {
        ok: false,
        error: "Codes are 4–12 letters/numbers.",
      };
      return NextResponse.json(body, { status: 400 });
    }

    const snap = await db.syncSnapshot.findUnique({ where: { code } });
    if (!snap) {
      const body: SyncLoadResponse = {
        ok: false,
        error: "No snapshot found for that code yet.",
      };
      return NextResponse.json(body, { status: 404 });
    }

    const body: SyncLoadResponse = {
      ok: true,
      data: JSON.parse(snap.payload) as BackupData,
      updatedAt: snap.updatedAt.toISOString(),
    };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[sync:GET]", error);
    const body: SyncLoadResponse = {
      ok: false,
      error: "Cloud storage is unavailable right now.",
    };
    return NextResponse.json(body, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const waitMs = rateDelay(req, "POST");
    if (waitMs > 0) {
      const body: SyncSaveResponse = { ok: false, error: RATE_MESSAGE };
      return tooManyRequests(waitMs, RATE_MESSAGE);
    }

    const raw = (await req.json().catch(() => null)) as {
      code?: unknown;
      data?: unknown;
    } | null;

    const code = String(raw?.code ?? "").toUpperCase();
    if (!CODE_RE.test(code)) {
      const body: SyncSaveResponse = {
        ok: false,
        error: "Codes are 4–12 letters/numbers.",
      };
      return NextResponse.json(body, { status: 400 });
    }

    // Reuse the defensive backup parser: the payload must be a well-formed
    // Lean Bulk Studio file, and every field gets clamped into a safe range.
    const parsed = parseBackup(JSON.stringify(raw?.data ?? null));
    if (!parsed.ok) {
      const body: SyncSaveResponse = { ok: false, error: parsed.error };
      return NextResponse.json(body, { status: 400 });
    }

    const payload = JSON.stringify(parsed.data);
    if (payload.length > MAX_PAYLOAD_CHARS) {
      const body: SyncSaveResponse = {
        ok: false,
        error: "Snapshot is too large to store.",
      };
      return NextResponse.json(body, { status: 413 });
    }

    const snap = await db.syncSnapshot.upsert({
      where: { code },
      create: { code, payload },
      update: { payload },
    });

    const body: SyncSaveResponse = {
      ok: true,
      savedAt: snap.updatedAt.toISOString(),
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error("[sync:POST]", error);
    const body: SyncSaveResponse = {
      ok: false,
      error: "Cloud storage is unavailable right now.",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
