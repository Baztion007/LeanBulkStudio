# Lean Bulk Studio

An offline-first Progressive Web App for running a 6-week dumbbell lean-bulk program. Log workouts, track progressive overload, manage your nutrition surplus, and sync a backup to the cloud with a sync code — everything works fully offline.

## Features

- **Program Builder** — the training plan is fully user-owned: rename routines, add / remove / reorder exercises, tune sets · reps · rest per exercise, toggle weighted / bodyweight, and assign routines to weekdays. Ships with an Upper (A) / Lower (B) split you can reshape or reset to defaults.
- **6-week program engine** — three progressive phases (Foundation → Volume → Intensity) with RIR effort targets and automatic week / phase tracking.
- **Workout logging** — per-set weight · reps · notes, progress badges (weight up / reps up / matched), copy-last-set, bonus sessions on rest days.
- **Rest timer** — global and per-routine rest targets with a full-screen overlay timer that starts when you log a set.
- **Plate math** — dumbbell plate solver with a custom plate-kit editor (add / remove plates, adjust handle empty weight).
- **Analytics** — weekly volume trends, PR cards, body-weight trend with surplus-band guidance and healthy gain-pace checks (+0.25–0.5 % / week).
- **Nutrition & water** — TDEE calculator with activity levels, +400 kcal lean-bulk surplus target, daily water boxes.
- **Cloud sync** — snapshot save / restore keyed by a user-chosen sync code, plus JSON backup export / import.
- **PWA** — installable, Service-Worker-precached shell, offline banner, works without a network.
- **Polished UX** — dark / light themes, 44 px touch targets, `aria-live` feedback, keyboard-accessible, error boundaries.

## Tech Stack

| Layer      | Choice                                        |
| ---------- | --------------------------------------------- |
| Framework  | Next.js 16 (App Router) · TypeScript 5        |
| UI         | Tailwind CSS 4 · shadcn/ui · lucide-react     |
| State      | Zustand with persisted, migrated local state  |
| Backend    | Next.js Route Handlers + Prisma + SQLite      |
| Offline    | Vanilla Service Worker (precached app shell)  |

## Getting Started

```bash
bun install
bun run db:push   # creates the SQLite database used by the sync API
bun run dev       # http://localhost:3000
```

Your workout data lives client-side (persisted Zustand store in `localStorage`). The server-side database is only used to store cloud-sync snapshots keyed by sync codes.

## Project Structure

```
src/
  app/            # App Router: page, layout, manifest, /api/sync
  components/
    lean-bulk/    # feature tabs (dashboard, workout, program, progress, tools)
    ui/           # shadcn/ui primitives
  lib/
    fitness/      # domain constants, types, zustand store, utils
public/
  sw.js           # Service Worker: precache + runtime caching
prisma/
  schema.prisma   # sync snapshot store
```

## Cloud Sync & Privacy

- A sync snapshot is the full validated workout data, keyed by a 4–12 char code **you** choose — that code is the only credential. Pick something unguessable.
- Saving replaces the snapshot for that code; loading restores it on any device.
- The API sanitizes every payload with the same defensive parser used for backup imports, applies a 2 MB payload cap, and rate-limits per IP to make code guessing impractical.

## Deployment Notes

- Requires a Node-capable host (Vercel, Fly.io, VPS) for `/api/sync`; everything else is a static PWA.
- Set `DATABASE_URL` (SQLite) in the environment; run `bun run db:push` on deploy.
- Bump `VERSION` in `public/sw.js` when shipping asset changes so clients pick up the new shell.
