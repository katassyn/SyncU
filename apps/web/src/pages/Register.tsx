import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '@syncu/ui'
import { registerUser } from '../lib/auth'

/**
 * G-6.10: Strona /register.
 * Formularz email + displayName + haslo + powtorka hasla.
 * POST do /auth/register, potem auto-login (POST /auth/login).
 * Po sukcesie redirect na /onboarding (nowy user musi wybrac grupe).
 */
export default function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== passwordConfirm) {
      setError('Hasla sie nie zgadzaja')
      return
    }
    if (password.length < 8) {
      setError('Haslo musi miec min. 8 znakow')
      return
    }
    if (displayName.trim().length < 2) {
      setError('Imie musi miec min. 2 znaki')
      return
    }

    setLoading(true)
    try {
      await registerUser(email, password, displayName.trim())
      // Nowy user nie ma jeszcze wybranej grupy -> onboarding
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany blad rejestracji')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-57px)] flex items-center justify-center px-4 py-8">
      <Card variant="white" padding="lg" className="w-full max-w-md">
        <h1 className="text-h2 font-bold text-heading mb-1">Stworz konto</h1>
        <p className="text-ui text-muted mb-6">
          Zacznij od wyboru swojej grupy - reszta to plan, kolokwia i nauka.
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
            label="Imie wyswietlane"
            type="text"
            placeholder="Maks S."
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
          <Input
            label="Haslo"
            type="password"
            placeholder="min. 8 znakow"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            minLength={8}
          />
          <Input
            label="Powtorz haslo"
            type="password"
            placeholder="potwierdzenie"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            autoComplete="new-password"
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
            {loading ? 'Tworzenie konta...' : 'Stworz konto'}
          </Button>
        </form>

        <p className="text-ui text-muted text-center mt-6">
          Masz juz konto?{' '}
          <NavLink
            to="/login"
            className="text-primary-nav font-semibold hover:underline"
          >
            Zaloguj sie
          </NavLink>
        </p>
      </Card>
    </div>
  )
}
