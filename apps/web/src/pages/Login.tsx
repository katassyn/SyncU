import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '@syncu/ui'
import { loginUser } from '../lib/auth'

/**
 * G-6.9: Strona /login.
 * Formularz email + haslo, POST do /auth/login, zapis tokenu w localStorage,
 * redirect na /today (lub /onboarding jezeli user jeszcze nie wybral grupy).
 */
export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await loginUser(email, password)
      // Po loginie: jezeli user nie wybral jeszcze grupy, lec na onboarding;
      // w przeciwnym razie na /today.
      const hasGroup = !!localStorage.getItem('syncu.selectedGroup')
      navigate(hasGroup ? '/today' : '/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany blad logowania')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4">
      <Card variant="white" padding="lg" className="w-full max-w-md">
        <h1 className="text-h2 font-bold text-heading mb-1">Zaloguj sie</h1>
        <p className="text-ui text-muted mb-6">
          Dostep do planu zajec, kolokwiow i statystyk nauki.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="ty@pk.edu.pl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            label="Haslo"
            type="password"
            placeholder="min. 8 znakow"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            minLength={8}
          />

          {error && (
            <p className="text-ui text-danger -mt-1">{error}</p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            disabled={loading}
          >
            {loading ? 'Logowanie...' : 'Zaloguj sie'}
          </Button>
        </form>

        <p className="text-ui text-muted text-center mt-6">
          Nie masz konta?{' '}
          <NavLink
            to="/register"
            className="text-primary-nav font-semibold hover:underline"
          >
            Zarejestruj sie
          </NavLink>
        </p>
      </Card>
    </div>
  )
}
