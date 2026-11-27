import { describe, expect, it } from "vitest";
import {
  cleanSearchQuery,
  cleanText,
  headerSafe,
  maskEmail,
  SEARCH_MAX_LENGTH,
} from "@/lib/sanitize";

describe("cleanText", () => {
  it("removes control characters, bidi overrides and zero-width characters", () => {
    expect(cleanText("a\u0000b\u0007c‮d​e﻿", 100)).toBe("abcde");
  });
  it("normalises compatibility characters (NFKC)", () => {
    expect(cleanText("ｆｕｌｌ width", 100)).toBe("full width");
  });
  it("caps by code points without splitting surrogate pairs", () => {
    const out = cleanText("😀".repeat(10), 3);
    expect(Array.from(out)).toHaveLength(3);
    expect(out).toBe("😀😀😀");
  });
  it("collapses whitespace on single-line fields and keeps newlines on multi-line", () => {
    expect(cleanText("  a \n\t b  ", 50)).toBe("a b");
    expect(cleanText("a\r\nb\n\n\n\n\nc", 50, true)).toBe("a\nb\n\n\nc");
  });
  it("returns empty string for non-strings", () => {
    expect(cleanText(undefined, 10)).toBe("");
    expect(cleanText({ toString: () => "x" }, 10)).toBe("");
  });
});

describe("headerSafe", () => {
  it("strips CR/LF so values can never add email headers", () => {
    const out = headerSafe("Hello\r\nBcc: victim@example.com\nX-Evil: 1");
    expect(out).not.toMatch(/[\r\n]/);
    expect(out).toBe("Hello Bcc: victim@example.com X-Evil: 1");
  });
});

describe("search query cleaning", () => {
  it("caps the query length", () => {
    expect(cleanSearchQuery("x".repeat(500))).toHaveLength(SEARCH_MAX_LENGTH);
  });
});

describe("maskEmail", () => {
  it("never logs the full address", () => {
    expect(maskEmail("jane.doe@example.com")).toBe("j***@example.com");
    expect(maskEmail("nope")).toBe("***");
  });
});
