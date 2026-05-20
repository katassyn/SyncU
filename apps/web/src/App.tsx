import { Routes, Route, Navigate } from 'react-router-dom'

import { AppLayout } from './components/AppLayout'
import Today from './pages/Today'
import Profile from './pages/Profile'
import Week from './pages/Week'
import Subject from './pages/Subject'
import Focus from './pages/Focus'
import Library from './pages/Library'
import Import from './pages/Import'
import Login from './pages/Login'
import Register from './pages/Register'
import Onboarding from './pages/Onboarding'
import NotFound from './pages/NotFound'

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/week" replace />} />

        <Route path="/today" element={<Today />} />
        <Route path="/week" element={<Week />} />
        <Route path="/subject/:id" element={<Subject />} />
        <Route path="/focus" element={<Focus />} />
        <Route path="/library" element={<Library />} />
        <Route path="/import" element={<Import />} />

        {/* Auth + onboarding (G-6.9, G-6.10, G-7.4) */}
        <Route path="/profile" element={<Profile />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  )
}

export default App
