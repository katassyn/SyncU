import type { ReactNode } from 'react'

/**
 * Wspolny shell tresci strony - tytul + opis + slot na zawartosc.
 *
 * AppLayout zewnetrzny dostarcza sidebar + topbar + <main>, wiec PageShell
 * to tylko semantyczna sekcja z naglowkiem (`<section>`) - unikamy
 * podwojnego `<main>`.
 */
type Props = {
  title: string
  subtitle?: string
  children?: ReactNode
}

export function PageShell({ title, subtitle, children }: Props) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-display text-heading">{title}</h1>
      {subtitle && (
        <p className="text-ui text-muted mt-1">{subtitle}</p>
      )}
      <div className="mt-6">
        {children ?? (
          <div className="border-2 border-dashed border-border-subtle rounded-card p-8 text-center text-muted italic">
            Strona w budowie - placeholder
          </div>
        )}
      </div>
    </section>
  )
}
