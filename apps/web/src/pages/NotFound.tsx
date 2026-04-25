import { NavLink } from 'react-router-dom'
import { PageShell } from './PageShell'

export default function NotFound() {
  return (
    <PageShell title="404" subtitle="Strona nie istnieje.">
      <NavLink to="/today">Wroc na today</NavLink>
    </PageShell>
  )
}
