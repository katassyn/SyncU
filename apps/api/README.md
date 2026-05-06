# @syncu/api

Backend SyncU — Bun + Elysia, drizzle-orm, SQLite, deploy na Hetzner VPS.

## Dev

```bash
bun install
cp .env.example .env
cd apps/api && bun run db:migrate
bun run dev
```

Endpoint startowy: `http://localhost:3001`

## Drizzle

Skrypty w `apps/api`:

```bash
bun run db:generate
bun run db:migrate
bun run db:studio
```
