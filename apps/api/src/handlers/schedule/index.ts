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
  getSectionsByGroupPrefix,
  getEntriesByLecturerAbbr,
  getLecturerByNormalizedAbbr,
  getFullScheduleData,
} from "../../db";

async function ensureFreshData(): Promise<void> {
  const { url, filename } = await scrapeXlsUrl();

  const cachedFilename = getCachedFilename();
  if (cachedFilename === filename) return;

  const xlsBuffer = await downloadXls(url);
  const scheduleData = parseSchedule(xlsBuffer, url);

  saveSchedule(scheduleData, filename, normalize);
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
      const sections = getSectionsByGroupPrefix(groupId);

      if (sections.length === 0) {
        throw new Error(`Group "${groupId}" not found`);
      }

      return {
        sourceUrl: getSourceUrl(),
        sections,
        lecturers: getAllLecturers(),
      };
    },
    { params: t.Object({ groupId: t.String() }) }
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
