import { Button } from '@syncu/ui'
import { addDays, formatWeekLabel, startOfWeek } from '../lib/week'

type Props = {
  weekStart: Date
  onChange: (newStart: Date) => void
}

export function WeekDatePicker({ weekStart, onChange }: Props) {
  const prev = () => onChange(addDays(weekStart, -7))
  const next = () => onChange(addDays(weekStart, 7))
  const today = () => onChange(startOfWeek(new Date()))

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <Button type="button" variant="secondary" size="sm" onClick={prev} aria-label="Poprzedni tydzień">
        ←
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={today}>
        Dziś
      </Button>
      <Button type="button" variant="secondary" size="sm" onClick={next} aria-label="Następny tydzień">
        →
      </Button>
      <span className="ml-3 text-ui font-semibold text-heading">{formatWeekLabel(weekStart)}</span>
    </div>
  )
}
