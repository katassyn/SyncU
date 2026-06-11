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

## Demo seed

```bash
cd apps/api
bun run db:seed:demo
```

Seed jest idempotentny dla grupy `DEMO_32_1`: odtwarza demo userow, kursy,
zajecia, kolokwia, materialy plikowe, wydarzenia i przykladowe dane planu.

Konta demo:

- `demo.anna@syncu.test`
- `demo.bartek@syncu.test`
- `demo.celina@syncu.test`

Haslo dla wszystkich: `DemoStrong123!`
