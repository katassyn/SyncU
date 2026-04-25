import { Routes, Route, NavLink, Navigate } from 'react-router-dom'

import Today from './pages/Today'
import Week from './pages/Week'
import Subject from './pages/Subject'
import Focus from './pages/Focus'
import Library from './pages/Library'
import Import from './pages/Import'
import NotFound from './pages/NotFound'

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
        <Route path="/" element={<Navigate to="/today" replace />} />

        <Route path="/today" element={<Today />} />
        <Route path="/week" element={<Week />} />
        <Route path="/subject/:id" element={<Subject />} />
        <Route path="/focus" element={<Focus />} />
        <Route path="/library" element={<Library />} />
        <Route path="/import" element={<Import />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
