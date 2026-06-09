/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  type AuthUser,
  type LoginResponse,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from './auth'

export type AuthState =
  | { kind: 'loading' }
  | { kind: 'authenticated'; user: AuthUser }
  | { kind: 'anonymous' }

type AuthActions = {
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<LoginResponse>
  setUser: (user: AuthUser) => void
}

const AuthContext = createContext<({ auth: AuthState } & AuthActions) | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ kind: 'loading' })

  useEffect(() => {
    getCurrentUser().then((user) => {
      setAuth(user ? { kind: 'authenticated', user } : { kind: 'anonymous' })
    })
  }, [])

  async function login(email: string, password: string): Promise<LoginResponse> {
    const res = await loginUser(email, password)
    setAuth({ kind: 'authenticated', user: res.user })
    return res
  }

  async function logout(): Promise<void> {
    await logoutUser()
    setAuth({ kind: 'anonymous' })
  }

  async function register(email: string, password: string, displayName: string): Promise<LoginResponse> {
    const res = await registerUser(email, password, displayName)
    setAuth({ kind: 'authenticated', user: res.user })
    return res
  }

  function setUser(user: AuthUser): void {
    setAuth({ kind: 'authenticated', user })
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout, register, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx.auth
}

export function useAuthActions(): AuthActions {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthActions must be used inside AuthProvider')
  return { login: ctx.login, logout: ctx.logout, register: ctx.register, setUser: ctx.setUser }
}
