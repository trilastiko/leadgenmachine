import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes every cell", () => {
    expect(toCsv([["a", "b"], ["c", 1]])).toBe('"a","b"\n"c","1"');
  });

  it("escapes embedded quotes", () => {
    expect(toCsv([['He said "hi"']])).toBe('"He said ""hi"""');
  });

  it("preserves commas, newlines, nulls", () => {
    expect(toCsv([["a, b", "c\nd", null]])).toBe('"a, b","c\nd",""');
  });
});
