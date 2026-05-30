import { Elysia, t } from "elysia";
import { normalize } from "@syncu/core";
import { scrapeXlsUrl, downloadXls } from "./helpers";
import { parseSchedule } from "./parser";
import {
  getCachedFilename,
  saveSchedule,
  getSourceUrl,
  getAllSections,
  getAllLecturers,
  getRecentScheduleChanges,
  getSectionsByGroupPrefix,
  getEntriesByLecturerAbbr,
  getLecturerByNormalizedAbbr,
  getFullScheduleData,
} from "../../db";
import { flattenScheduleData } from "../../db/schedule-changes";

type RecentChangeEntry = {
  id: number;
  scheduleId: string;
  changeType: "added" | "removed" | "modified";
  changedAt: string;
  prevData: Record<string, unknown> | null;
  currentData: Record<string, unknown> | null;
};

async function ensureFreshData(): Promise<void> {
  const { url, filename } = await scrapeXlsUrl();

  const cachedFilename = getCachedFilename();
  if (cachedFilename === filename) return;

  const xlsBuffer = await downloadXls(url);
  const scheduleData = parseSchedule(xlsBuffer, url);

  saveSchedule(scheduleData, filename, normalize);
}

export function buildGroupScheduleResponse(groupId: string) {
  const sections = getSectionsByGroupPrefix(groupId);

  if (sections.length === 0) {
    throw new Error(`Group "${groupId}" not found`);
  }

  const sourceUrl = getSourceUrl();
  const lecturers = getAllLecturers();
  const flattenedEntries = flattenScheduleData(
    {
      sourceUrl,
      sections,
      lecturers,
    },
    normalize,
  );
  const currentEntriesByScheduleId = new Map(
    flattenedEntries.map((entry) => [
      entry.scheduleId,
      {
        scheduleId: entry.scheduleId,
        sectionId: entry.sectionId,
        label: entry.label,
        yearSemLabel: entry.yearSemLabel,
        groupId: entry.groupId,
        date: entry.date,
        time: entry.time,
        subject: entry.subject,
      },
    ]),
  );

  const recentChanges: RecentChangeEntry[] = getRecentScheduleChanges(groupId).map((change) => ({
    id: change.id,
    scheduleId: change.scheduleId,
    changeType: change.changeType,
    changedAt: change.changedAt,
    prevData: change.prevDataJson ? JSON.parse(change.prevDataJson) : null,
    currentData: currentEntriesByScheduleId.get(change.scheduleId) ?? null,
  }));

  return {
    sourceUrl,
    sections,
    lecturers,
    recentChanges,
  };
}

export const scheduleRoutes = new Elysia({ prefix: "/schedule" })
  .get("/", async () => {
    await ensureFreshData();
    return getFullScheduleData();
  })
  .get("/groups", async () => {
    await ensureFreshData();
    const groups = getAllSections().map((s) => ({
      id: s.id,
      label: s.label,
      yearSemLabel: s.yearSemLabel,
      groupId: s.groupId,
    }));
    return { groups, sourceUrl: getSourceUrl() };
  })
  .get("/lecturers", async () => {
    await ensureFreshData();
    return { lecturers: getAllLecturers(), sourceUrl: getSourceUrl() };
  })
  .get(
    "/group/:groupId",
    async ({ params: { groupId } }) => {
      await ensureFreshData();
      return buildGroupScheduleResponse(groupId);
    },
    { params: t.Object({ groupId: t.String() }) }
  )
  .get(
    "/changes",
    ({ query }) => {
      const changes = getRecentScheduleChanges(query.groupId);
      return { count: changes.length, changes };
    },
    { query: t.Object({ groupId: t.String() }) }
  )
  .get(
    "/lecturer/:abbr",
    async ({ params: { abbr } }) => {
      await ensureFreshData();
      const normalizedAbbr = normalize(abbr);

      const entries = getEntriesByLecturerAbbr(normalizedAbbr);

      // Deduplicate
      const seen = new Set<string>();
      const unique = entries.filter((e) => {
        const key = `${e.date}|${e.time}|${e.subject}|${e.group}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const lecturer = getLecturerByNormalizedAbbr(normalizedAbbr);

      return {
        lecturer: lecturer ?? { abbr, name: "", email: "" },
        entries: unique,
        sourceUrl: getSourceUrl(),
      };
    },
    { params: t.Object({ abbr: t.String() }) }
  );
