import { describe, expect, test } from "bun:test";
import {
  fillMerges,
  discoverSections,
  extractEntries,
  extractAllEntries,
  parseLegend,
} from "./parser";

describe("fillMerges", () => {
  test("does nothing when merges is undefined", () => {
    const data = [[1, 2], [3, 4]];
    fillMerges(data, undefined);
    expect(data).toEqual([[1, 2], [3, 4]]);
  });

  test("fills merged range with top-left value", () => {
    const data = [
      ["A", undefined, undefined],
      [undefined, undefined, undefined],
    ];
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 1, c: 2 } }];
    fillMerges(data, merges as any);
    expect(data).toEqual([
      ["A", "A", "A"],
      ["A", "A", "A"],
    ]);
  });

  test("fills value 0 correctly", () => {
    const data = [[0, undefined]];
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    fillMerges(data, merges as any);
    expect(data).toEqual([[0, 0]]);
  });

  test("skips merge when top-left is undefined", () => {
    const data = [[undefined, "B"]];
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    fillMerges(data, merges as any);
    expect(data).toEqual([[undefined, "B"]]);
  });

  test("creates missing rows during fill", () => {
    const data: any[][] = [["X"]];
    const merges = [{ s: { r: 0, c: 0 }, e: { r: 2, c: 0 } }];
    fillMerges(data, merges as any);
    expect(data[1][0]).toBe("X");
    expect(data[2][0]).toBe("X");
  });
});

describe("discoverSections", () => {
  test("returns empty array when no group row found", () => {
    const data = [["header", "nothing"]];
    expect(discoverSections(data)).toEqual([]);
  });

  test("discovers sections from header with year/sem and group IDs", () => {
    // Row 0: year/sem label
    // Row 1: group IDs
    const data: any[][] = [];
    data[0] = [null, null, "ROK I sem 1", null, null, "ROK II sem 3"];
    data[1] = [null, null, 11, 12, null, 21, 22];

    const sections = discoverSections(data);

    expect(sections.length).toBe(4);
    expect(sections[0].id).toBe("11_1");
    expect(sections[0].groupId).toBe(11);
    expect(sections[0].yearSemLabel).toBe("ROK I sem 1");
    expect(sections[0].columns).toEqual([2]);

    expect(sections[1].id).toBe("12_1");
    expect(sections[1].groupId).toBe(12);

    expect(sections[2].id).toBe("21_1");
    expect(sections[2].yearSemLabel).toBe("ROK II sem 3");

    expect(sections[3].id).toBe("22_1");
  });

  test("handles multiple columns per group (subgroups)", () => {
    const data: any[][] = [];
    data[0] = [null, null, "ROK I sem 1"];
    data[1] = [null, null, 11, 11];

    const sections = discoverSections(data);

    expect(sections.length).toBe(2);
    expect(sections[0].id).toBe("11_1");
    expect(sections[0].columns).toEqual([2]);
    expect(sections[1].id).toBe("11_2");
    expect(sections[1].columns).toEqual([3]);
  });

  test("works without year/sem row", () => {
    const data: any[][] = [];
    data[0] = [null, null, 31, 32];

    const sections = discoverSections(data);

    expect(sections.length).toBe(2);
    expect(sections[0].yearSemLabel).toBe("");
    expect(sections[0].label).toBe("Grupa 31_1");
  });
});

describe("extractEntries", () => {
  test("extracts entries from time slot rows", () => {
    const data: any[][] = [
      [45000, "8:00 - 10:30", null, "Math OB"],
      [null, "11:00 - 13:00", null, "Physics KN"],
    ];
    const section = { id: "11_1", label: "Test", yearSemLabel: "", groupId: 11, columns: [3] };

    const entries = extractEntries(data, section);

    expect(entries.length).toBe(2);
    expect(entries[0].time).toBe("8:00 - 10:30");
    expect(entries[0].subject).toBe("Math OB");
    expect(entries[0].date).toBe("15.03");
    expect(entries[1].time).toBe("11:00 - 13:00");
    expect(entries[1].subject).toBe("Physics KN");
  });

  test("detects date from sobota/niedziela rows", () => {
    const data: any[][] = [
      [null, "sobota", null, null],
      [45000, "8:00 - 10:30", null, "Math"],
    ];
    const section = { id: "11_1", label: "Test", yearSemLabel: "", groupId: 11, columns: [3] };

    const entries = extractEntries(data, section);

    expect(entries.length).toBe(1);
    expect(entries[0].date).toBe("15.03");
  });

  test("deduplicates entries with same date/time/subject", () => {
    const data: any[][] = [
      [45000, "8:00 - 10:30", null, "Math"],
      [null, "8:00 - 10:30", null, "Math"],
    ];
    const section = { id: "11_1", label: "Test", yearSemLabel: "", groupId: 11, columns: [3] };

    const entries = extractEntries(data, section);

    expect(entries.length).toBe(1);
  });

  test("skips rows with empty section columns", () => {
    const data: any[][] = [
      [45000, "8:00 - 10:30", null, null],
    ];
    const section = { id: "11_1", label: "Test", yearSemLabel: "", groupId: 11, columns: [3] };

    const entries = extractEntries(data, section);

    expect(entries.length).toBe(0);
  });
});

describe("extractAllEntries", () => {
  test("returns map with entries for each section", () => {
    const data: any[][] = [
      [45000, "8:00 - 10:30", "Math", "Physics"],
    ];
    const sections = [
      { id: "11_1", label: "A", yearSemLabel: "", groupId: 11, columns: [2] },
      { id: "12_1", label: "B", yearSemLabel: "", groupId: 12, columns: [3] },
    ];

    const map = extractAllEntries(data, sections);

    expect(map.size).toBe(2);
    expect(map.get("11_1")![0].subject).toBe("Math");
    expect(map.get("12_1")![0].subject).toBe("Physics");
  });
});

describe("parseLegend", () => {
  test("extracts lecturers from legend section", () => {
    const data: any[][] = [];
    // Rows before legend
    data[0] = ["some", "schedule", "data"];
    // Legend header
    data[1] = [null, null, "Legenda"];
    // Column headers (skipped)
    data[2] = [null, null, "Skrót", "Imię i nazwisko", null, null, null, null, null, null, null, null, "Email"];
    // Lecturer rows
    data[3] = [null, null, "OB", "dr Olaf Bar", null, null, null, null, null, null, null, null, "olaf@pk.edu.pl"];
    data[4] = [null, null, "KN", "dr Kamil Nowak", null, null, null, null, null, null, null, null, "kamil@pk.edu.pl"];
    // Empty row to end
    data[5] = [];
    data[6] = [];

    const lecturers = parseLegend(data);

    expect(lecturers.length).toBe(2);
    expect(lecturers[0]).toEqual({ abbr: "OB", name: "dr Olaf Bar", email: "olaf@pk.edu.pl" });
    expect(lecturers[1]).toEqual({ abbr: "KN", name: "dr Kamil Nowak", email: "kamil@pk.edu.pl" });
  });

  test("returns empty array when no legend found", () => {
    const data: any[][] = [["no", "legend", "here"]];
    expect(parseLegend(data)).toEqual([]);
  });

  test("handles missing name and email gracefully", () => {
    const data: any[][] = [];
    data[0] = [null, null, "Legenda"];
    data[1] = [null, null, "headers"];
    data[2] = [null, null, "AB"];
    data[3] = [];
    data[4] = [];

    const lecturers = parseLegend(data);

    expect(lecturers.length).toBe(1);
    expect(lecturers[0]).toEqual({ abbr: "AB", name: "", email: "" });
  });

  test("stops after two consecutive empty abbreviation rows", () => {
    const data: any[][] = [];
    data[0] = [null, null, "Legenda"];
    data[1] = [null, null, "headers"];
    data[2] = [null, null, "AB", "Name A", null, null, null, null, null, null, null, null, "a@b.c"];
    data[3] = [];
    data[4] = [];
    data[5] = [null, null, "CD", "Name C"];

    const lecturers = parseLegend(data);

    expect(lecturers.length).toBe(1);
  });
});
