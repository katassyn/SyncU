import { Routes, Route, Navigate } from 'react-router-dom'

import { AppLayout } from './components/AppLayout'
import Today from './pages/Today'
import Week from './pages/Week'
import Subject from './pages/Subject'
import Focus from './pages/Focus'
import Library from './pages/Library'
import Import from './pages/Import'
import NotFound from './pages/NotFound'

function App() {
  return (
    <AppLayout>
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
    </AppLayout>
  )
}

export default App
