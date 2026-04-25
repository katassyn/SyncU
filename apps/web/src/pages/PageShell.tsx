import type { ReactNode } from 'react'

/**
 * Wspolny shell dla strony-stuba: tytul + opis + slot na docelowa zawartosc.
 * Docelowo (G-3 / G-4) kazda strona dostanie wlasna logike, ale "ksztalt" zostaje.
 */
type Props = {
  title: string
  subtitle?: string
  children?: ReactNode
}

export function PageShell({ title, subtitle, children }: Props) {
  return (
    <main style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '0.25rem' }}>{title}</h1>
      {subtitle && (
        <p style={{ color: '#6B7280', marginTop: 0 }}>{subtitle}</p>
      )}
      <div style={{ marginTop: '1.5rem' }}>
        {children ?? (
          <div
            style={{
              border: '2px dashed #E5E7EB',
              borderRadius: 8,
              padding: '2rem',
              textAlign: 'center',
              color: '#9CA3AF',
              fontStyle: 'italic',
            }}
          >
            Strona w budowie - placeholder
          </div>
        )}
      </div>
    </main>
  )
}
