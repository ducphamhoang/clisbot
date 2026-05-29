import { describe, expect, test } from "bun:test";
import { truncateString } from "../../src/utils/string-utils.ts";

describe("truncateString", () => {
  test("returns the original string when it is already within the limit", () => {
    expect(truncateString("hello", 5)).toBe("hello");
    expect(truncateString("hello", 10)).toBe("hello");
  });

  test("truncates plain ascii text to the requested length", () => {
    expect(truncateString("hello world", 5)).toBe("hello");
  });

  test("does not split surrogate-pair emoji", () => {
    expect(truncateString("🙂abc", 1)).toBe("🙂");
    expect(truncateString("a🙂bc", 2)).toBe("a🙂");
  });

  test("does not split combining-character accents", () => {
    const accented = "e\u0301clair";

    expect(truncateString(accented, 1)).toBe("e\u0301");
    expect(truncateString(accented, 2)).toBe("e\u0301c");
  });

  test("does not split joined emoji grapheme clusters", () => {
    expect(truncateString("👩‍💻 coding", 1)).toBe("👩‍💻");
  });

  test("returns an empty string when maxLength is zero", () => {
    expect(truncateString("hello", 0)).toBe("");
    expect(truncateString("", 0)).toBe("");
  });

  test("throws for invalid maxLength values", () => {
    expect(() => truncateString("hello", -1)).toThrow(RangeError);
    expect(() => truncateString("hello", 1.5)).toThrow(RangeError);
    expect(() => truncateString("hello", Number.NaN)).toThrow(RangeError);
  });
});
