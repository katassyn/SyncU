import { describe, expect, test } from "bun:test";
import { normalize } from "./index";

describe("normalize", () => {
  test("lowercases input", () => {
    expect(normalize("ABC")).toBe("abc");
  });

  test("strips Polish diacritics", () => {
    expect(normalize("ąćęłńóśźż")).toBe("acelnoszz");
    expect(normalize("ĄĆĘŁŃÓŚŹŻ")).toBe("acelnoszz");
  });

  test("collapses multiple spaces", () => {
    expect(normalize("dr  inż.   Jan")).toBe("dr inz. jan");
  });

  test("trims whitespace", () => {
    expect(normalize("  hello  ")).toBe("hello");
  });

  test("handles combined diacritics + case + spaces", () => {
    expect(normalize("  Wykład  Środa  ")).toBe("wyklad sroda");
  });

  test("returns empty string for empty input", () => {
    expect(normalize("")).toBe("");
    expect(normalize("   ")).toBe("");
  });
});
