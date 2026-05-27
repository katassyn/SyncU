import { useEffect, useState } from 'react'
import { fetchScheduleChanges, type ScheduleChangeRecord } from '../lib/api'

interface Props {
  groupId: string
}

const changeTypeLabel: Record<ScheduleChangeRecord['changeType'], string> = {
  added:    'Dodano',
  removed:  'Usunięto',
  modified: 'Zmieniono',
}

const changeTypeIcon: Record<ScheduleChangeRecord['changeType'], string> = {
  added:    '+',
  removed:  '−',
  modified: '~',
}

function parseScheduleId(scheduleId: string): { date: string; time: string; subject: string } {
  const parts = scheduleId.split('|')
  return {
    date:    parts[1] ?? '',
    time:    parts[2] ?? '',
    subject: parts[3] ?? scheduleId,
  }
}

export function ChangeNotice({ groupId }: Props) {
  const [count, setCount] = useState<number | null>(null)
  const [changes, setChanges] = useState<ScheduleChangeRecord[]>([])
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchScheduleChanges(groupId)
      .then((res) => {
        if (cancelled) return
        setCount(res.count)
        setChanges(res.changes)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [groupId])

  if (!count) return null

  return (
    <div className="mb-4 rounded-card border border-warning/30 bg-[rgb(217_119_6_/_.07)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 gap-4">
        <div className="flex items-center gap-2 text-ui font-semibold text-warning">
          <WarningIcon />
          <span>{count} {count === 1 ? 'zmiana' : 'zmiany'} w tym tygodniu</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-ui text-warning/80 font-medium hover:text-warning transition-colors cursor-pointer shrink-0"
        >
          {expanded ? 'Ukryj ↑' : 'Zobacz zmiany ↓'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-warning/20 px-4 py-3 flex flex-col gap-2">
          {changes.map((c) => {
            const parsed = c.changeType === 'removed' && c.prevDataJson
              ? JSON.parse(c.prevDataJson) as { subject: string; date: string; time: string }
              : parseScheduleId(c.scheduleId)
            return (
              <div key={c.id} className="flex items-start gap-3 text-ui text-body">
                <span className="font-bold text-warning shrink-0 w-4 text-center">
                  {changeTypeIcon[c.changeType]}
                </span>
                <div className="min-w-0">
                  <span className="font-medium text-heading">{parsed.subject}</span>
                  <span className="text-muted ml-2">{parsed.date} · {parsed.time}</span>
                  <span className="ml-2 text-caption text-muted">{changeTypeLabel[c.changeType]}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function WarningIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path
        d="M8 2L14.5 13.5H1.5L8 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 6.5v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
