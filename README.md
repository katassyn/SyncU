# SyncU — Synchronise University

Aplikacja dla studentow laczaca plan zajec, generator harmonogramu nauki do
kolokwiow i spolecznosciowa biblioteke materialow dziedziczona miedzy
rocznikami.

## Zespol

| Osoba               | Rola                     | Obszar                                      |
| ------------------- |--------------------------| ------------------------------------------- |
| Wiktor Zabek        | Frontend / Lider         | Komponenty UI, widoki, prezentacja          |
| Kamil Gebala        | Backend                  | Architektura, API, baza danych              |
| Aleksander Dygoń    | Full-stack / DevOps      | Autentykacja, deploy                        |
| Maksymilian Stuglik | Frontend / Documentation | Backlog, widoki nauki, Confluence           |

## Tech stack

- **Frontend:** React + TypeScript (Vite) — deploy: Vercel
- **Backend:** Bun + Elysia — deploy: Fly.io
- **Baza danych:** SQLite (dev)
- **Monorepo:** Turborepo + Bun Workspaces
- **Testy:** Vitest (unit/integration), Playwright (e2e)

## Struktura

```
apps/
  web/    # Frontend - React + TypeScript (Vite)
  api/    # Backend - Bun + Elysia
packages/
  types/  # Wspoldzielone typy TS
  ui/     # Komponenty React
  core/   # Czyste funkcje biznesowe
turbo.json
package.json
```

## Setup lokalny

Wymagania: **Bun >= 1.1**, **Docker Desktop**, **Git**.

```bash
bun install
docker compose up -d
bun run db:migrate
bun run dev
```

Skopiuj `.env.example` do `.env` i uzupelnij zmienne.

## Skrypty (root)

| Skrypt             | Opis                                   |
| ------------------ | -------------------------------------- |
| `bun run dev`      | Dev dla wszystkich aplikacji (turbo)   |
| `bun run build`    | Build calosci                          |
| `bun run lint`     | Lint wszystkich pakietow               |
| `bun run test`     | Testy (Vitest)                         |
| `bun run db:migrate` | Migracje SQLite w `@syncu/api`       |

## Branching

- `main` — produkcja, wymaga PR + review
- `develop` — integracja, baza dla feature branchy
- `feature/<nazwa>` — nowe funkcje
- `fix/<nazwa>` — poprawki

Konwencja commitow: `feat:`, `fix:`, `chore:`.
