# SyncU — Synchronise University

Aplikacja dla studentow laczaca plan zajec, generator harmonogramu nauki do
kolokwiow i spolecznosciowa biblioteke materialow dziedziczona miedzy
rocznikami.

## Zespol

| Osoba               | Rola                     | Obszar                                      |
| ------------------- |--------------------------| ------------------------------------------- |
| Wiktor Zabek        | Frontend / Lider         | Komponenty UI, widoki, prezentacja          |
| Kamil Gebala        | Backend                  | Architektura, API, baza danych              |
| Aleksander Dygo     | Full-stack / DevOps      | Autentykacja, deploy                        |
| Maksymilian Stuglik | Frontend / Documentation | Backlog, widoki nauki, Confluence           |

## Tech stack

- **Frontend:** React + TypeScript (Vite) — deploy: Vercel
- **Backend:** Bun + Elysia — deploy: Hetzner
- **Baza danych:** SQLite (dev)
- **Monorepo:** Bun Workspaces
- **Testy:** `bun test` (built-in, unit / integration / e2e)

## Glowne ekrany

| Widok      | Opis                                                   |
| ---------- | ------------------------------------------------------ |
| Dashboard  | Zajecia dnia + najblizsze kolokwia + zadania nauki     |
| Kalendarz  | Plan zajec + obciazenie kolokwiami, planowanie         |
| Grupy      | Zajecia, dokumenty, kolokwia, materialy                |
| Biblioteka | Materialy (uczelnia -> kierunek -> rok -> przedmiot)   |

## Struktura

```
apps/
  web/    # Frontend - React + TypeScript (Vite)
  api/    # Backend - Bun + Elysia
packages/
  types/  # Wspoldzielone typy TS
  ui/     # Komponenty React
  core/   # Czyste funkcje biznesowe
package.json
```

## Setup lokalny

Wymagania: **Bun >= 1.1**, **Git**.

```bash
bun install
bun run dev
```

Skopiuj `.env.example` do `.env` i uzupelnij zmienne.

## Skrypty (root)

| Skrypt               | Opis                                       |
| -------------------- | ------------------------------------------ |
| `bun run dev`        | Dev rownolegle dla wszystkich workspace'ow |
| `bun run dev:web`    | Tylko frontend                             |
| `bun run dev:api`    | Tylko backend                              |
| `bun run build`      | Build calosci                              |
| `bun run lint`       | Lint wszystkich pakietow                   |
| `bun run test`       | `bun test` we wszystkich workspace'ach     |
| `bun run db:migrate` | Migracje SQLite w `@syncu/api`             |

## Branching

- `main` — produkcja, wymaga PR + review
- `develop` — integracja, baza dla feature branchy
- `feature/<nazwa>` — nowe funkcje
- `fix/<nazwa>` — poprawki

Konwencja commitow: `feat:`, `fix:`, `chore:`.
