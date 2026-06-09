import { useEffect, useMemo, useState } from 'react'
import { Button, FormField, Input, Badge, Select } from '@syncu/ui'
import {
  getUserInitial,
  type AuthUser,
  updateCurrentUserProfile,
} from '../lib/auth'
import { useAuth, useAuthActions } from '../lib/AuthContext'
import { fetchGroups, type GroupSummary } from '../lib/api'

const STUDY_PROFILE = {
  university: 'Politechnika Krakowska',
  fieldOfStudy: 'Informatyka',
  mode: 'Studia niestacjonarne',
} as const

const stats = [
  { label: 'Sesje nauki', value: '42' },
  { label: 'Notatki', value: '12' },
  { label: 'Wspólne zasoby', value: '8' },
  { label: 'Dni aktywności', value: '31' },
]

type ProfileForm = {
  displayName: string
  groupId: string
}

type GroupsState =
  | { kind: 'loading' }
  | { kind: 'loaded'; groups: GroupSummary[] }
  | { kind: 'error'; message: string }

export default function Profile() {
  const auth = useAuth()
  const { setUser } = useAuthActions()
  const [form, setForm] = useState<ProfileForm | null>(null)
  const [savedUser, setSavedUser] = useState<AuthUser | null>(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [groupsState, setGroupsState] = useState<GroupsState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchGroups()
      .then((res) => {
        if (cancelled) return
        if (res.groups.length === 0) {
          setGroupsState({
            kind: 'error',
            message: 'Backend nie zwrócił żadnych grup. Spróbuj później.',
          })
          return
        }
        setGroupsState({ kind: 'loaded', groups: res.groups })
      })
      .catch((err) => {
        if (!cancelled) {
          setGroupsState({
            kind: 'error',
            message: err instanceof Error ? err.message : 'Nieznany błąd pobierania grup',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sessionUser = auth.kind === 'authenticated' ? auth.user : null
  const user = savedUser && sessionUser && savedUser.id === sessionUser.id
    ? savedUser
    : sessionUser
  const formValues = form ?? (user ? formFromUser(user) : null)
  const sortedGroups = useMemo(() => {
    if (groupsState.kind !== 'loaded') return []
    return sortGroups(groupsState.groups)
  }, [groupsState])
  const selectedGroup = formValues?.groupId
    ? sortedGroups.find((group) => group.id === formValues.groupId) ?? null
    : null
  const displayedGroupId = selectedGroup?.id ?? formValues?.groupId ?? user?.groupId ?? ''
  const currentGroupLabel = selectedGroup?.label ?? user?.groupId ?? 'Nie wybrano'
  const currentYear = displayedGroupId ? parseYearFromGroup(displayedGroupId) : user?.yearOfStudy ?? null
  const currentYearLabel = currentYear === null ? 'Nie wybrano' : `${currentYear}`

  if (auth.kind === 'loading' || !user || !formValues) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
        <p className="text-ui text-muted">Ładowanie profilu...</p>
      </div>
    )
  }

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => current ? { ...current, [field]: value } : current)
    setError(null)
    setSuccess(null)
  }

  function startEditing() {
    if (!user) return
    setForm(formFromUser(user))
    setEditing(true)
    setError(null)
    setSuccess(null)
  }

  function cancelEditing() {
    setForm(null)
    setEditing(false)
    setError(null)
    setSuccess(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !formValues) return

    const displayName = formValues.displayName.trim()
    if (displayName.length < 2) {
      setError('Nazwa użytkownika musi mieć co najmniej 2 znaki.')
      return
    }

    const groupId = formValues.groupId || null
    const groupChanged = groupId !== (user.groupId ?? null)
    if (groupChanged && groupsState.kind !== 'loaded') {
      setError('Nie udało się załadować listy grup. Spróbuj ponownie później.')
      return
    }
    if (groupsState.kind === 'loaded' && groupId && !sortedGroups.some((group) => group.id === groupId)) {
      setError('Wybierz grupę z listy.')
      return
    }
    const yearOfStudy = groupId ? parseYearFromGroup(groupId) : null

    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const updatedUser = await updateCurrentUserProfile({
        displayName,
        university: STUDY_PROFILE.university,
        fieldOfStudy: STUDY_PROFILE.fieldOfStudy,
        yearOfStudy,
        groupId,
      })

      syncStoredGroup(updatedUser.groupId)
      setSavedUser(updatedUser)
      setUser(updatedUser)
      setForm(null)
      setEditing(false)
      setSuccess('Zapisano zmiany.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd zapisu profilu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-6 mb-8">
        <div className="size-20 rounded-pill border-2 border-primary/10 bg-primary-light text-primary-nav font-bold text-display flex items-center justify-center shrink-0 select-none">
          {getUserInitial(user)}
        </div>
        <div className="min-w-0">
          <h1 className="text-display font-extrabold text-heading m-0 leading-none truncate">
            {user.displayName}
          </h1>
          <p className="text-body text-muted mt-1 mb-0">{user.email}</p>
          <div className="mt-2">
            <Badge variant="success">Aktywny</Badge>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-h3 font-bold text-heading m-0">Dane konta</p>
            <div className="flex items-center gap-2">
              {editing ? (
                <>
                  <Button type="button" variant="secondary" size="sm" onClick={cancelEditing} disabled={saving}>
                    Anuluj
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={saving}>
                    {saving ? 'Zapisywanie...' : 'Zapisz'}
                  </Button>
                </>
              ) : (
                <Button type="button" variant="secondary" size="sm" onClick={startEditing}>
                  Edytuj
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <FormField label="Nazwa" htmlFor="displayName">
              <Input
                id="displayName"
                value={formValues.displayName}
                onChange={(e) => updateField('displayName', e.target.value)}
                disabled={!editing || saving}
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
              />
            </FormField>
            <FormField label="Adres e-mail" htmlFor="email" hint="Adres e-mail jest przypisany do logowania.">
              <Input id="email" type="email" value={user.email} readOnly />
            </FormField>
          </div>

          {error && <p className="text-ui text-danger">{error}</p>}
          {success && <p className="text-ui text-primary-nav">{success}</p>}
        </div>

        <div className="lg:col-span-5 flex flex-col gap-5">
          <div className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-h3 font-bold text-heading m-0">Studia</p>
              {!editing && (
                <Button type="button" variant="secondary" size="sm" onClick={startEditing}>
                  Zmień
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-4">
              <StudyRow label="Uczelnia" value={STUDY_PROFILE.university} />
              <StudyRow label="Kierunek" value={STUDY_PROFILE.fieldOfStudy} />
              <StudyRow label="Tryb" value={STUDY_PROFILE.mode} />
              <StudyRow label="Rok" value={currentYearLabel} />
              {editing ? (
                <>
                  {groupsState.kind === 'error' && (
                    <p className="text-ui text-danger">{groupsState.message}</p>
                  )}
                  <Select
                    label="Grupa"
                    id="groupId"
                    placeholder="Wybierz grupę"
                    value={selectedGroup?.id ?? ''}
                    onChange={(e) => updateField('groupId', e.target.value)}
                    disabled={saving || groupsState.kind !== 'loaded'}
                  >
                    {sortedGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.label}
                      </option>
                    ))}
                  </Select>
                  {(formValues.groupId || null) !== (user.groupId ?? null) && (
                    <div className="rounded-card-sm border border-warning/40 bg-warning/5 px-3 py-2.5">
                      <p className="text-caption text-heading m-0 leading-snug">
                        <span className="font-bold text-warning">Uwaga: </span>
                        zmiana grupy zaktualizuje Twój plan zajęć, kolokwia i statystyki
                        na dane nowej grupy.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <StudyRow label="Grupa" value={currentGroupLabel} />
              )}
            </div>
          </div>

          <div className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
            <p className="text-h3 font-bold text-heading m-0">Statystyki</p>
            <div className="grid grid-cols-2 gap-3">
              {stats.map(({ label, value }) => (
                <div key={label} className="bg-surface-1 rounded-card-sm p-4 flex flex-col gap-1">
                  <span className="text-display font-extrabold text-primary-nav leading-none">{value}</span>
                  <span className="text-caption text-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </form>

    </div>
  )
}

function formFromUser(user: AuthUser): ProfileForm {
  return {
    displayName: user.displayName,
    groupId: user.groupId ?? '',
  }
}

function syncStoredGroup(groupId: string | null) {
  try {
    if (groupId) {
      localStorage.setItem('syncu.selectedGroup', groupId)
    } else {
      localStorage.removeItem('syncu.selectedGroup')
    }
  } catch {
    // ignore
  }
}

function sortGroups(groups: GroupSummary[]): GroupSummary[] {
  return [...groups].sort((a, b) => {
    const ag = Number(a.groupId)
    const bg = Number(b.groupId)
    if (ag !== bg) return ag - bg
    return a.id.localeCompare(b.id)
  })
}

function parseYearFromGroup(groupId: string): number | null {
  const year = Number(groupId.charAt(0))
  return Number.isInteger(year) && year >= 1 && year <= 10 ? year : null
}

function StudyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
      <span className="text-caption font-bold text-muted uppercase tracking-label">{label}</span>
      <span className="text-ui font-semibold text-heading text-right">{value}</span>
    </div>
  )
}
