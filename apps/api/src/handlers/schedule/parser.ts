import * as XLSX from "xlsx";
import type {
  ScheduleEntry,
  SectionConfig,
  LecturerInfo,
  ScheduleData,
} from "@syncu/types";
import { excelDateToJSDate } from "./helpers";

export function fillMerges(
  data: any[][],
  merges: XLSX.Range[] | undefined
): void {
  if (!merges) return;
  for (const merge of merges) {
    const val = data[merge.s.r]?.[merge.s.c];
    if (val === undefined && val !== 0) continue;
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      if (!data[r]) data[r] = [];
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        data[r][c] = val;
      }
    }
  }
}

const YEAR_SEM_PATTERN = /ROK\s+[IVX]+\s+sem\s+\d+/i;
const GROUP_STRING_PATTERN = /^[A-Z]{2}\d{1,2}$/;
const SKIP_CELLS = new Set(["sobota", "niedziela"]);

function isGroupCell(cell: unknown): cell is number | string {
  if (typeof cell === "number") return cell > 0 && cell < 100;
  if (typeof cell === "string") {
    const trimmed = cell.trim();
    return !SKIP_CELLS.has(trimmed) && GROUP_STRING_PATTERN.test(trimmed);
  }
  return false;
}

function normalizeGroupId(cell: number | string): number | string {
  return typeof cell === "number" ? cell : cell.toString().trim();
}

function countGroupCells(row: any[]): number {
  let count = 0;
  for (let c = 2; c < row.length; c++) {
    if (isGroupCell(row[c])) count++;
  }
  return count;
}

export function discoverSections(data: any[][]): SectionConfig[] {
  const headerRows = data.slice(0, 15);

  let yearSemRow = -1;
  for (let r = 0; r < headerRows.length; r++) {
    const row = headerRows[r];
    if (!row) continue;
    for (const cell of row) {
      if (cell && typeof cell === "string" && YEAR_SEM_PATTERN.test(cell)) {
        yearSemRow = r;
        break;
      }
    }
    if (yearSemRow >= 0) break;
  }

  let groupRow = -1;
  if (yearSemRow >= 0 && headerRows[yearSemRow + 1]) {
    groupRow = yearSemRow + 1;
  }
  if (groupRow < 0 || countGroupCells(headerRows[groupRow]) < 2) {
    groupRow = -1;
    for (let r = 0; r < headerRows.length; r++) {
      const row = headerRows[r];
      if (!row) continue;
      if (countGroupCells(row) >= 2) {
        groupRow = r;
        break;
      }
    }
  }

  if (groupRow < 0) return [];

  function resolveYearSem(col: number): string {
    if (yearSemRow < 0 || !headerRows[yearSemRow]) return "";
    for (let c = col; c >= 0; c--) {
      const cell = headerRows[yearSemRow][c];
      if (cell && typeof cell === "string" && YEAR_SEM_PATTERN.test(cell)) {
        return cell.trim();
      }
    }
    return "";
  }

  const groupColumnsMap = new Map<string, number[]>();
  const row = headerRows[groupRow];
  for (let c = 2; c < row.length; c++) {
    if (isGroupCell(row[c])) {
      const gid = normalizeGroupId(row[c]);
      const yearSem = resolveYearSem(c);
      const key = yearSem ? `${gid}@@${yearSem}` : String(gid);
      if (!groupColumnsMap.has(key)) groupColumnsMap.set(key, []);
      groupColumnsMap.get(key)!.push(c);
    }
  }

  const sections: SectionConfig[] = [];
  const sortedGroups = [...groupColumnsMap.entries()].sort(
    (a, b) => a[1][0] - b[1][0]
  );

  const seenGroupIds = new Map<string, number>();

  for (const [compositeKey, columns] of sortedGroups) {
    const [groupKey, yearSemLabel = ""] = compositeKey.split("@@");
    const groupId: number | string = /^\d+$/.test(groupKey)
      ? Number(groupKey)
      : groupKey;

    const occurrence = (seenGroupIds.get(groupKey) ?? 0) + 1;
    seenGroupIds.set(groupKey, occurrence);
    const idPrefix = occurrence > 1 ? `${groupId}_s${occurrence}` : `${groupId}`;

    for (let s = 0; s < columns.length; s++) {
      sections.push({
        id: `${idPrefix}_${s + 1}`,
        label: yearSemLabel
          ? `${yearSemLabel} - Grupa ${groupId}_${s + 1}`
          : `Grupa ${groupId}_${s + 1}`,
        yearSemLabel,
        groupId,
        columns: [columns[s]],
      });
    }
  }

  return sections;
}

export function extractEntries(
  data: any[][],
  section: SectionConfig
): ScheduleEntry[] {
  const entries: ScheduleEntry[] = [];
  const seen = new Set<string>();
  let currentDate = "";

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    if (row[1] === "sobota" || row[1] === "niedziela") {
      for (let j = i + 1; j < data.length; j++) {
        const nextRow = data[j];
        if (
          nextRow &&
          nextRow[0] &&
          typeof nextRow[0] === "number" &&
          nextRow[0] > 40000
        ) {
          const date = excelDateToJSDate(nextRow[0]);
          const day = date.getDate();
          const month = date.getMonth() + 1;
          currentDate = `${day}.${month < 10 ? "0" + month : month}`;
          break;
        }
        if (
          nextRow &&
          (nextRow[1] === "sobota" || nextRow[1] === "niedziela")
        )
          break;
      }
      continue;
    }

    if (
      row[1] &&
      typeof row[1] === "string" &&
      /\d[.:]\d{2}\s*-\s*\d/.test(row[1])
    ) {
      const time = row[1];

      if (row[0] && typeof row[0] === "number" && row[0] > 40000) {
        const date = excelDateToJSDate(row[0]);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        currentDate = `${day}.${month < 10 ? "0" + month : month}`;
      }

      const values = new Set<string>();
      for (const col of section.columns) {
        const cell = row[col];
        if (cell !== undefined && cell !== null && cell.toString().trim()) {
          values.add(cell.toString().trim());
        }
      }

      if (values.size > 0) {
        const subject = Array.from(values).join(" | ");
        const key = `${currentDate}|${time}|${subject}`;
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({
            time,
            date: currentDate || "N/A",
            subject,
          });
        }
      }
    }
  }

  return entries;
}

export function extractAllEntries(
  data: any[][],
  sections: SectionConfig[]
): Map<string, ScheduleEntry[]> {
  const map = new Map<string, ScheduleEntry[]>();
  for (const section of sections) {
    map.set(section.id, extractEntries(data, section));
  }
  return map;
}

export function parseLegend(data: any[][]): LecturerInfo[] {
  const lecturers: LecturerInfo[] = [];

  let legendRow = -1;
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;
    for (const cell of row) {
      if (
        cell &&
        typeof cell === "string" &&
        cell.trim().toLowerCase() === "legenda"
      ) {
        legendRow = r;
        break;
      }
    }
    if (legendRow >= 0) break;
  }

  if (legendRow < 0) return lecturers;

  for (let r = legendRow + 2; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;

    const abbr = row[2];
    const name = row[3];
    const email = row[12];

    if (!abbr || typeof abbr !== "string" || !abbr.trim()) {
      const nextRow = data[r + 1];
      const nextAbbr = nextRow?.[2];
      if (!nextAbbr || typeof nextAbbr !== "string" || !nextAbbr.trim()) break;
      continue;
    }

    lecturers.push({
      abbr: abbr.toString().trim(),
      name: name ? name.toString().trim() : "",
      email: email ? email.toString().trim() : "",
    });
  }

  return lecturers;
}

export function parseSchedule(xlsBuffer: Uint8Array, sourceUrl: string): ScheduleData {
  const workbook = XLSX.read(xlsBuffer, { type: "array" });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  fillMerges(data, worksheet["!merges"]);

  const sectionConfigs = discoverSections(data);
  const entriesMap = extractAllEntries(data, sectionConfigs);
  const lecturers = parseLegend(data);

  return {
    sourceUrl,
    sections: sectionConfigs.map((s) => ({
      id: s.id,
      label: s.label,
      yearSemLabel: s.yearSemLabel,
      groupId: s.groupId,
      entries: entriesMap.get(s.id) ?? [],
    })),
    lecturers,
  };
}
