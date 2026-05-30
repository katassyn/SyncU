import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = useAuth()
  if (auth.kind === 'loading') return null
  if (auth.kind === 'anonymous') return <Navigate to="/login" replace />
  return <>{children}</>
}
