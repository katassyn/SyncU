import { describe, expect, test } from 'bun:test'
import {
  discoverSections,
  excelDateToJSDate,
  extractEntries,
  fillMerges,
  parseLegend,
} from './parser'

describe('excelDateToJSDate', () => {
  test('zamienia Excel serial number 45000 na konkretna date', () => {
    // Excel serial 45000 = 2023-03-15
    const d = excelDateToJSDate(45000)
    expect(d.getFullYear()).toBe(2023)
    expect(d.getMonth()).toBe(2) // marzec
    expect(d.getDate()).toBe(15)
  })
})

describe('fillMerges', () => {
  test('rozpraszowuje wartosc z lewej-gornej komorki na caly merge range', () => {
    const data: any[][] = [
      ['ROK III sem 6', undefined, undefined],
      [undefined, undefined, undefined],
    ]
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 2 } }]
    fillMerges(data, merges)
    expect(data[0][0]).toBe('ROK III sem 6')
    expect(data[0][2]).toBe('ROK III sem 6')
    expect(data[1][1]).toBe('ROK III sem 6')
  })

  test('nie wybucha gdy merges = undefined', () => {
    const data: any[][] = [['a']]
    fillMerges(data, undefined)
    expect(data[0][0]).toBe('a')
  })
})

describe('discoverSections', () => {
  test('wykrywa sekcje gdy sa naglowek ROK + wiersz numerow grup', () => {
    const data: any[][] = [
      [],
      ['ROK III sem 6', undefined, undefined, undefined],
      [],
      [undefined, undefined, 31, 32], // 2 grupy znane
    ]
    const sections = discoverSections(data)
    expect(sections).toHaveLength(2)
    expect(sections[0]).toMatchObject({
      id: '31_1',
      groupId: 31,
      yearSemLabel: 'ROK III sem 6',
      label: 'ROK III sem 6 - Grupa 31_1',
    })
    expect(sections[1].groupId).toBe(32)
  })

  test('jedna grupa rozdzielona na 2 podgrupy (powtorzona kolumna) -> 2 sekcje 31_1 i 31_2', () => {
    const data: any[][] = [
      ['ROK III sem 6'],
      [undefined, 31, 31, 32], // grupa 31 w 2 kolumnach
    ]
    const sections = discoverSections(data)
    const grp31 = sections.filter((s) => s.groupId === 31)
    expect(grp31).toHaveLength(2)
    expect(grp31[0].id).toBe('31_1')
    expect(grp31[1].id).toBe('31_2')
  })

  test('zwraca [] gdy brak wiersza z grupami', () => {
    const data: any[][] = [['ROK III sem 6'], ['cos', 'innego']]
    expect(discoverSections(data)).toEqual([])
  })
})

describe('extractEntries', () => {
  test('parsuje wpisy z sobota + slot czasowy + Excel serial date', () => {
    // Excel serial 45000 = 2023-03-15 -> "15.03"
    const data: any[][] = [
      [undefined, 'sobota'],
      [45000, '8.00-10.30', undefined, 'PWA OB 117BD'],
      [undefined, '10.45-13.15', undefined, 'AI MK 207'],
    ]
    const section = {
      id: '32_1',
      label: 'Grupa 32_1',
      yearSemLabel: '',
      groupId: 32,
      columns: [3],
    }
    const entries = extractEntries(data, section)
    expect(entries).toHaveLength(2)
    expect(entries[0]).toEqual({
      time: '8.00-10.30',
      date: '15.03',
      subject: 'PWA OB 117BD',
    })
    expect(entries[1]).toEqual({
      time: '10.45-13.15',
      date: '15.03', // dziedziczy poprzednia date
      subject: 'AI MK 207',
    })
  })

  test('pomija puste komorki w docelowej kolumnie', () => {
    const data: any[][] = [
      [undefined, 'sobota'],
      [45000, '8.00-10.30', 'tylko-w-1', undefined], // kolumna 3 pusta
    ]
    const section = {
      id: 'x',
      label: 'x',
      yearSemLabel: '',
      groupId: 1,
      columns: [3],
    }
    expect(extractEntries(data, section)).toEqual([])
  })

  test('deduplikacja po (date, time, subject)', () => {
    const data: any[][] = [
      [undefined, 'sobota'],
      [45000, '8.00-10.30', undefined, 'PWA'],
      [undefined, '8.00-10.30', undefined, 'PWA'], // duplikat
    ]
    const section = {
      id: 'x',
      label: 'x',
      yearSemLabel: '',
      groupId: 1,
      columns: [3],
    }
    expect(extractEntries(data, section)).toHaveLength(1)
  })
})

describe('parseLegend', () => {
  test('wyciaga prowadzacych z sekcji Legenda (abbr, name, email)', () => {
    const data: any[][] = [
      // ... wpisy planu pominiete
      [undefined, undefined, undefined, undefined],
      [undefined, 'Legenda'],
      [undefined, undefined, 'skrot', 'imie i nazwisko', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'email'], // header
      [undefined, undefined, 'OB', 'dr Olaf Bar', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'olaf.bar@pk.edu.pl'],
      [undefined, undefined, 'MK', 'mgr Maria Kos', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'maria@pk.edu.pl'],
      [], // pusty wiersz
      [], // drugi pusty -> koniec legendy
    ]
    const lecturers = parseLegend(data)
    expect(lecturers).toHaveLength(2)
    expect(lecturers[0]).toEqual({
      abbr: 'OB',
      name: 'dr Olaf Bar',
      email: 'olaf.bar@pk.edu.pl',
    })
    expect(lecturers[1].abbr).toBe('MK')
  })

  test('zwraca [] gdy nie ma sekcji Legenda', () => {
    const data: any[][] = [['inne'], ['dane']]
    expect(parseLegend(data)).toEqual([])
  })
})
