import { describe, expect, test } from 'bun:test'
import { entryMatchesSubject, extractSubjectName, extractSubjects } from './subjects'

// Prawdziwe stringi z planu PK (sekcja 32_1, plik lato 2025/2026)
const REAL_CELLS = [
  'Programowanie interfejsów graficznych                                           wykład                                                     dr hab. inż. arch. Paweł Ozimek, prof. PK                                            ZDALNIE',
  'Metody uczenia maszynowego\nwykład\nImię i nazwisko:\ndr hab. inż. Michał Bereta, prof. PK                                          ZDALNIE',
  'Testowanie oprogramowania\nwykład\nmgr inż. Dominik Kulis                      ZDALNIE',
  'Wstęp do projektowanie aplikacji internetowych\nwykład\nmgr inż. Adrian Widłak                                  ZDALNIE',
  'WdPAI\nlab.        AWid         s. 114 GIL',
  'Prawne aspekty działalności w branży IT ćwiczenia                            mgr Joanna Dudek                   s. N',
  'MUM              lab.                 OB            s. 135',
  'PIG                lab.         DR             s. 136',
  'Projekt zespołowy P                  PJ                   s. 303 KMS',
  'TO\nlab.          NOKIA          ZDALNIE',
  'Inżynieria oprogramowania\nwykład \ndr hab. inż. Marek Stanuszek, prof. PK                                    ZDALNIE',
  'IO\nP             MS           s. 303 KMS',
  'BRAK ZAJĘĆ',
]

describe('extractSubjectName', () => {
  test('cuts at full type word (wykład)', () => {
    expect(extractSubjectName(REAL_CELLS[1])).toBe('Metody uczenia maszynowego')
    expect(extractSubjectName(REAL_CELLS[3])).toBe(
      'Wstęp do projektowanie aplikacji internetowych',
    )
  })

  test('cuts at dotted form (lab.)', () => {
    expect(extractSubjectName(REAL_CELLS[4])).toBe('WdPAI')
    expect(extractSubjectName(REAL_CELLS[6])).toBe('MUM')
  })

  test('cuts at standalone capital letter type (P)', () => {
    expect(extractSubjectName(REAL_CELLS[8])).toBe('Projekt zespołowy')
    expect(extractSubjectName(REAL_CELLS[11])).toBe('IO')
  })

  test('does not cut at lowercase "w" inside the name', () => {
    expect(extractSubjectName(REAL_CELLS[5])).toBe(
      'Prawne aspekty działalności w branży IT',
    )
  })

  test('returns null for BRAK ZAJĘĆ and empty cells', () => {
    expect(extractSubjectName('BRAK ZAJĘĆ')).toBeNull()
    expect(extractSubjectName('   ')).toBeNull()
  })
})

describe('extractSubjects', () => {
  const entries = REAL_CELLS.map((subject) => ({ subject }))
  const subjects = extractSubjects(entries)
  const names = subjects.map((s) => s.name)

  test('merges abbreviations into full names by word initials', () => {
    // MUM -> Metody uczenia maszynowego, PIG -> Programowanie interfejsów...,
    // TO -> Testowanie oprogramowania, IO -> Inżynieria oprogramowania,
    // WdPAI -> Wstęp do projektowanie aplikacji internetowych
    expect(names).toContain('Metody uczenia maszynowego')
    expect(names).toContain('Programowanie interfejsów graficznych')
    expect(names).toContain('Testowanie oprogramowania')
    expect(names).toContain('Inżynieria oprogramowania')
    expect(names).toContain('Wstęp do projektowanie aplikacji internetowych')
    expect(names).not.toContain('MUM')
    expect(names).not.toContain('PIG')
    expect(names).not.toContain('TO')
    expect(names).not.toContain('IO')
    expect(names).not.toContain('WdPAI')
  })

  test('keeps standalone subjects and skips BRAK ZAJĘĆ', () => {
    expect(names).toContain('Projekt zespołowy')
    expect(names).toContain('Prawne aspekty działalności w branży IT')
    expect(names.some((n) => /brak zaj/i.test(n))).toBe(false)
  })

  test('counts entries across full name + abbreviation', () => {
    const mum = subjects.find((s) => s.name === 'Metody uczenia maszynowego')!
    expect(mum.entryCount).toBe(2) // wykład (pelna nazwa) + lab (MUM)
  })
})

describe('entryMatchesSubject', () => {
  const subjects = extractSubjects(REAL_CELLS.map((subject) => ({ subject })))
  const mum = subjects.find((s) => s.name === 'Metody uczenia maszynowego')!

  test('matches both full-name and abbreviation cells', () => {
    expect(entryMatchesSubject(mum, REAL_CELLS[1])).toBe(true)
    expect(entryMatchesSubject(mum, REAL_CELLS[6])).toBe(true)
    expect(entryMatchesSubject(mum, REAL_CELLS[2])).toBe(false)
  })
})
