import { useParams } from 'react-router-dom'
import { PageShell } from './PageShell'

export default function Subject() {
  const { id } = useParams<{ id: string }>()
  return (
    <PageShell
      title={`Subject #${id ?? '?'}`}
      subtitle="Zajecia, dokumenty, kolokwia, materialy przedmiotu"
    />
  )
}
