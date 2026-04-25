import { describe, expect, test } from "bun:test";
import { Elysia } from "elysia";
import { scheduleRoutes } from "../handlers/schedule/index";
import type { LecturerInfo, ScheduleData } from "@syncu/types";

interface GroupInfo {
  id: string;
  label: string;
  yearSemLabel: string;
  groupId: number | string;
}

interface GroupsResponse {
  groups: GroupInfo[];
  sourceUrl: string;
}

interface LecturersResponse {
  lecturers: LecturerInfo[];
  sourceUrl: string;
}

interface LecturerScheduleResponse {
  lecturer: LecturerInfo;
  entries: Array<{ date: string; time: string; subject: string; group: string }>;
  sourceUrl: string;
}

const app = new Elysia().use(scheduleRoutes);

function req(path: string) {
  return app.handle(new Request(`http://localhost${path}`));
}

describe("frontend flow", () => {
  let groups: GroupInfo[];
  let lecturers: LecturerInfo[];

  test("STEP 1: fetch groups and lecturers to populate the UI", async () => {
    const [groupsRes, lecturersRes] = await Promise.all([
      req("/schedule/groups"),
      req("/schedule/lecturers"),
    ]);

    expect(groupsRes.status).toBe(200);
    expect(lecturersRes.status).toBe(200);

    const groupsBody = (await groupsRes.json()) as GroupsResponse;
    groups = groupsBody.groups;
    expect(groups).toBeArray();
    expect(groups.length).toBeGreaterThan(0);
    expect(groupsBody.sourceUrl).toBeString();

    for (const g of groups) {
      expect(g).toHaveProperty("id");
      expect(g).toHaveProperty("label");
      expect(g).toHaveProperty("yearSemLabel");
      expect(g).toHaveProperty("groupId");
    }

    const lecturersBody = (await lecturersRes.json()) as LecturersResponse;
    lecturers = lecturersBody.lecturers;
    expect(lecturers).toBeArray();
    expect(lecturers.length).toBeGreaterThan(0);

    for (const l of lecturers) {
      expect(l).toHaveProperty("abbr");
      expect(l).toHaveProperty("name");
      expect(l).toHaveProperty("email");
    }
  });

  test("STEP 2: user picks a group -> fetch its schedule", async () => {
    const picked = groups[0];
    const res = await req(`/schedule/group/${picked.id}`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as ScheduleData;
    expect(body.sections).toBeArray();
    expect(body.sections.length).toBeGreaterThan(0);

    const section = body.sections[0];
    expect(section.id).toBe(picked.id);
    expect(section.entries).toBeArray();
    expect(section.entries.length).toBeGreaterThan(0);

    const entry = section.entries[0];
    expect(entry).toHaveProperty("time");
    expect(entry).toHaveProperty("date");
    expect(entry).toHaveProperty("subject");
  });

  test("STEP 3: user picks a lecturer -> fetch their schedule", async () => {
    const picked = lecturers[0];
    const res = await req(`/schedule/lecturer/${encodeURIComponent(picked.abbr)}`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as LecturerScheduleResponse;
    expect(body.lecturer.abbr).toBe(picked.abbr);
    expect(body.lecturer.name).toBeString();
    expect(body.entries).toBeArray();
    expect(body.sourceUrl).toBeString();
  });
});
