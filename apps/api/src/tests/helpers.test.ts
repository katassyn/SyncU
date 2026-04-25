import { describe, expect, test } from "bun:test";
import { excelDateToJSDate } from "../handlers/schedule/helpers";

describe("excelDateToJSDate", () => {
  test("converts Excel serial 44927 to 2023-01-01", () => {
    const date = excelDateToJSDate(44927);
    expect(date.getFullYear()).toBe(2023);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(1);
  });

  test("converts Excel serial 45292 to 2024-01-01", () => {
    const date = excelDateToJSDate(45292);
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0);
    expect(date.getDate()).toBe(1);
  });

  test("converts Excel serial 45000 to 2023-03-15", () => {
    const date = excelDateToJSDate(45000);
    expect(date.getFullYear()).toBe(2023);
    expect(date.getMonth()).toBe(2);
    expect(date.getDate()).toBe(15);
  });
});
