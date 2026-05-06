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

- **Frontend:** React + TypeScript (Vite, Tailwind v4) — deploy: Vercel
- **Backend:** Bun + Elysia (drizzle-orm) — deploy: Hetzner VPS
- **Baza danych:** SQLite (dev + prod)
- **Monorepo:** Bun Workspaces
- **Testy:** `bun test` (built-in, unit / integration / e2e)

## Struktura

```
apps/
  web/    # Frontend - React + TypeScript (Vite)
  api/    # Backend - Bun + Elysia
docs/
  db/     # Diagramy i dokumentacja modelu danych
packages/
  types/  # Wspoldzielone typy TS
  ui/     # Komponenty React (Button, Card, Input, Badge, Modal)
  core/   # Czyste funkcje biznesowe (parser xlsx, normalize)
package.json
```

## Setup lokalny

Wymagania: **Bun >= 1.1**, **Git**.

```bash
bun install
cp .env.example .env
cd apps/api && bun run db:migrate && cd ../..
bun run dev
```

Skopiuj `.env.example` do `.env` i uzupelnij zmienne.

## Model danych

Diagram bazy w formacie DBML znajduje sie w `docs/db/schema.dbml`.

Plik jest zrodlem do importu w `dbdiagram.io`, a wygenerowany link mozna podpiac w Confluence.

## Skrypty (root)

| Skrypt               | Opis                                       |
| -------------------- | ------------------------------------------ |
| `bun run dev`        | Dev rownolegle dla wszystkich workspace'ow |
| `bun run dev:web`    | Tylko frontend                             |
| `bun run dev:api`    | Tylko backend                              |
| `bun run build`      | Build produkcyjny calosci                  |
| `bun run lint`       | ESLint wszystkich workspace'ow             |
| `bun run test`       | `bun test` we wszystkich workspace'ach     |
| `bun run db:migrate` | Migracje SQLite w `@syncu/api`             |

## Branching

- `main` — produkcja, wymaga PR + review
- `develop` — integracja, baza dla feature branchy
- `feature/<nazwa>` — nowe funkcje
- `fix/<nazwa>` — poprawki

Konwencja commitow: `feat:`, `fix:`, `chore:`.
