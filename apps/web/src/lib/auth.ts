/**
 * Klient auth dla SyncU.
 *
 * Endpointy uzywane (backend: apps/api/src/handlers/auth/index.ts):
 *  - POST /auth/register   body: { email, password, displayName }
 *                          ->  { user }                                     (201)
 *  - POST /auth/login      body: { email, password }
 *                          ->  { user, token }                              (200)
 *  - POST /auth/logout     header: Authorization: Bearer <token>
 *                          ->  204 / no body
 *  - GET  /auth/me         header: Authorization: Bearer <token>
 *                          ->  { user }
 *  - PATCH /me             header: Authorization: Bearer <token>
 *                          ->  { user }
 *
 * Token zapisywany w localStorage pod kluczem `syncu.token`. To prosty
 * helper bez kontekstu Reacta - pelny `AuthContext` z reaktywnoscia
 * (rerender Topbara po zalogowaniu itd.) robi Aleks w G-6.7.
 */

const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001'

const TOKEN_KEY = 'syncu.token'

/* --- Typy --- */

export type AuthUser = {
  id: number
  email: string
  displayName: string
  university: string | null
  fieldOfStudy: string | null
  yearOfStudy: number | null
  groupId: string | null
  createdAt: string
  updatedAt: string
}

export type LoginResponse = {
  user: AuthUser
  token: string
}

export type RegisterResponse = {
  user: AuthUser
}

type CurrentUserResponse = {
  user: AuthUser
}

export type UpdateProfileInput = {
  displayName?: string
  university?: string | null
  fieldOfStudy?: string | null
  yearOfStudy?: number | null
  groupId?: string | null
}

export function getUserInitial(user: Pick<AuthUser, 'displayName' | 'email'> | null): string {
  const source = user?.displayName.trim() || user?.email.trim() || 'U'
  return source.charAt(0).toUpperCase()
}

export function getUserFirstName(user: Pick<AuthUser, 'displayName'> | null): string {
  return user?.displayName.trim().split(/\s+/)[0] ?? ''
}

/* --- Token storage --- */

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // ignore (private mode itd.)
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

/* --- Fetch helper z error handlingiem --- */

async function authFetch<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(body.message || `HTTP ${res.status}`)
  }
  // /auth/logout zwraca 204 bez body
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/* --- API calls --- */

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await authFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  storeToken(res.token)
  return res
}

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
): Promise<LoginResponse> {
  // 1) Rejestracja
  await authFetch<RegisterResponse>('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  })
  // 2) Auto-login - backend nie wystawia tokenu przy /register, wiec
  //    natychmiast wolamy /login zeby user dostał token bez recznego logowania
  return loginUser(email, password)
}

export async function logoutUser(): Promise<void> {
  const token = getStoredToken()
  if (token) {
    try {
      await authFetch<void>('/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
    } catch {
      // Niewazne czy backend potwierdzil - czyscimy lokalny token i tak
    }
  }
  clearToken()
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = getStoredToken()
  if (!token) return null
  try {
    const res = await authFetch<CurrentUserResponse>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.user
  } catch {
    // Token wygasl albo nieprawidlowy - czyscimy
    clearToken()
    return null
  }
}

export async function updateCurrentUserProfile(
  input: UpdateProfileInput,
): Promise<AuthUser> {
  const token = getStoredToken()
  if (!token) throw new Error('Unauthorized')

  const res = await authFetch<CurrentUserResponse>('/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  })

  return res.user
}

