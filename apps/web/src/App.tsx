import { Routes, Route, NavLink, Navigate, useParams } from 'react-router-dom'

/**
 * G-2 punkt 1 - tylko routing.
 * Kazda strona ma na razie minimalny placeholder zeby nawigacja byla testowalna end-to-end.
 * G-2 punkt 2 podmieni te placeholdery na docelowe komponenty stron w `src/pages/`.
 */

function Placeholder({ title }: { title: string }) {
  return (
    <section style={{ padding: '2rem' }}>
      <h1>{title}</h1>
      <p style={{ opacity: 0.6 }}>Placeholder - strona w budowie.</p>
    </section>
  )
}

function SubjectPlaceholder() {
  const { id } = useParams<{ id: string }>()
  return <Placeholder title={`Subject #${id}`} />
}

function NotFound() {
  return (
    <section style={{ padding: '2rem' }}>
      <h1>404</h1>
      <p>Strona nie istnieje.</p>
      <NavLink to="/today">Wroc na dzis</NavLink>
    </section>
  )
}

function Nav() {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    padding: '0.5rem 0.75rem',
    textDecoration: 'none',
    color: isActive ? '#4F46E5' : '#374151',
    fontWeight: isActive ? 700 : 500,
  })
  return (
    <nav
      style={{
        display: 'flex',
        gap: '0.25rem',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #E5E7EB',
        background: '#FAFAFA',
      }}
    >
      <NavLink to="/today" style={linkStyle}>Today</NavLink>
      <NavLink to="/week" style={linkStyle}>Week</NavLink>
      <NavLink to="/subject/1" style={linkStyle}>Subject</NavLink>
      <NavLink to="/focus" style={linkStyle}>Focus</NavLink>
      <NavLink to="/library" style={linkStyle}>Library</NavLink>
      <NavLink to="/import" style={linkStyle}>Import</NavLink>
    </nav>
  )
}

function App() {
  return (
    <>
      <Nav />
      <Routes>
        {/* "/" -> domyslnie wyrzucamy na /today */}
        <Route path="/" element={<Navigate to="/today" replace />} />

        <Route path="/today" element={<Placeholder title="Today" />} />
        <Route path="/week" element={<Placeholder title="Week" />} />
        <Route path="/subject/:id" element={<SubjectPlaceholder />} />
        <Route path="/focus" element={<Placeholder title="Focus" />} />
        <Route path="/library" element={<Placeholder title="Library" />} />
        <Route path="/import" element={<Placeholder title="Import" />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
