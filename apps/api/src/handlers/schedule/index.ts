import { Elysia, t } from "elysia";
import { normalize } from "@syncu/core";
import { scrapeXlsUrl, downloadXls } from "./helpers";
import { parseSchedule } from "./parser";
import { getCachedSchedule, saveSchedule } from "../../db";
import type { ScheduleData } from "@syncu/types";

async function getScheduleData(): Promise<ScheduleData> {
  const { url, filename } = await scrapeXlsUrl();

  const cached = getCachedSchedule();
  if (cached && cached.xls_filename === filename) {
    return JSON.parse(cached.data_json);
  }

  const xlsBuffer = await downloadXls(url);
  const scheduleData = parseSchedule(xlsBuffer, url);

  saveSchedule(filename, JSON.stringify(scheduleData));

  return scheduleData;
}

export const scheduleRoutes = new Elysia({ prefix: "/schedule" })
  .get("/", async () => {
    return getScheduleData();
  })
  .get("/lecturers", async () => {
    const data = await getScheduleData();
    return data.lecturers;
  })
  .get(
    "/group/:groupId",
    async ({ params: { groupId } }) => {
      const data = await getScheduleData();
      const sections = data.sections.filter((s) => s.id.startsWith(groupId));

      if (sections.length === 0) {
        throw new Error(`Group "${groupId}" not found`);
      }

      return { ...data, sections };
    },
    { params: t.Object({ groupId: t.String() }) }
  )
  .get(
    "/lecturer/:abbr",
    async ({ params: { abbr } }) => {
      const data = await getScheduleData();
      const normalizedAbbr = normalize(abbr);

      const entries: Array<{
        date: string;
        time: string;
        subject: string;
        group: string;
      }> = [];
      const seen = new Set<string>();

      for (const section of data.sections) {
        for (const entry of section.entries) {
          if (normalize(entry.subject).includes(normalizedAbbr)) {
            const key = `${entry.date}|${entry.time}|${entry.subject}|${section.label}`;
            if (!seen.has(key)) {
              seen.add(key);
              entries.push({ ...entry, group: section.label });
            }
          }
        }
      }

      const lecturer = data.lecturers.find(
        (l) => normalize(l.abbr) === normalizedAbbr
      );

      return {
        lecturer: lecturer ?? { abbr, name: "", email: "" },
        entries,
        sourceUrl: data.sourceUrl,
      };
    },
    { params: t.Object({ abbr: t.String() }) }
  );
