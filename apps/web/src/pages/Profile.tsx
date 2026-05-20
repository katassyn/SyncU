import { Button, Card, Form, FormField, Input, Badge } from '@syncu/ui'

const placeholder = {
  displayName: 'Alex Student',
  email: 'alex@university.edu',
  university: 'Politechnika Krakowska',
  faculty: 'Informatyka',
  mode: 'Studia niestacjonarne',
  group: '32_1',
}

const stats = [
  { label: 'Sesje nauki',     value: '42' },
  { label: 'Notatki',         value: '12' },
  { label: 'Wspólne zasoby',  value: '8'  },
  { label: 'Dni aktywności',  value: '31' },
]

export default function Profile() {
  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-6 mb-8">
        <div className="size-20 rounded-pill border-2 border-primary/10 bg-primary-light text-primary-nav font-bold text-display flex items-center justify-center shrink-0 select-none">
          A
        </div>
        <div className="min-w-0">
          <h1 className="text-display font-extrabold text-heading m-0 leading-none truncate">
            {placeholder.displayName}
          </h1>
          <p className="text-body text-muted mt-1 mb-0">{placeholder.email}</p>
          <div className="mt-2">
            <Badge variant="success">Aktywny</Badge>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Dane konta — 7 kolumn */}
        <div className="lg:col-span-7 bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="text-h3 font-bold text-heading m-0">Dane konta</p>
            <Button variant="secondary" size="sm">Edytuj</Button>
          </div>
          <Form>
            <FormField label="Imię" htmlFor="displayName">
              <Input id="displayName" value={placeholder.displayName} readOnly />
            </FormField>
            <FormField label="Adres e-mail" htmlFor="email">
              <Input id="email" type="email" value={placeholder.email} readOnly />
            </FormField>
            <FormField label="Hasło" htmlFor="password">
              <Input id="password" type="password" value="••••••••" readOnly />
            </FormField>
          </Form>
        </div>

        {/* Prawa kolumna — 5 kolumn */}
        <div className="lg:col-span-5 flex flex-col gap-5">

          {/* Informacje o studiach */}
          <div className="bg-white rounded-card-lg shadow-card-sm p-6 flex flex-col gap-4">
            <p className="text-h3 font-bold text-heading m-0">Studia</p>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Uczelnia',  value: placeholder.university },
                { label: 'Kierunek', value: placeholder.faculty     },
                { label: 'Tryb',     value: placeholder.mode        },
                { label: 'Grupa',    value: placeholder.group       },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between gap-4 py-2 border-b border-border-subtle last:border-0">
                  <span className="text-caption font-bold text-muted uppercase tracking-label">{label}</span>
                  <span className="text-ui font-semibold text-heading text-right">{value}</span>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" className="w-fit">
              Zmień grupę
            </Button>
          </div>

          {/* Statystyki */}
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
      </div>

      {/* Danger zone */}
      <Card variant="surface" padding="lg" className="mt-5 border border-danger/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-body font-bold text-heading m-0">Usuń konto</p>
            <p className="text-ui text-muted mt-0.5 mb-0">
              Trwale usuwa konto i wszystkie powiązane dane.
            </p>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0 text-danger hover:bg-[rgb(168_56_54_/_.08)]">
            Usuń konto
          </Button>
        </div>
      </Card>

    </div>
  )
}
