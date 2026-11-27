import { describe, expect, it } from "vitest";
import { enquirySchema, fieldErrors } from "@/lib/enquiry-schema";
import { enquiryServiceOptions } from "@/content/services";
import { SQLI, XSS } from "./payloads";

const valid = {
  firstName: "Asha",
  lastName: "O'Neil-Rao",
  email: "Asha@Example.com",
  service: "Graphic design",
  message: "We need a logo and social pack for a launch in March.",
};

describe("enquirySchema", () => {
  it("accepts a valid enquiry and normalises it", () => {
    const r = enquirySchema.parse(valid);
    expect(r.email).toBe("asha@example.com");
    expect(r.website).toBe("");
  });
  it("offers every service plus Growth Bundle and Other", () => {
    expect(enquiryServiceOptions).toContain("Growth Bundle");
    expect(enquiryServiceOptions).toContain("Other");
    expect(enquiryServiceOptions).toHaveLength(13);
  });
  it("rejects services that are not on the allow-list", () => {
    expect(enquirySchema.safeParse({ ...valid, service: "<script>" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, service: "Graphic design " + "x" }).success).toBe(
      false,
    );
  });
  it("rejects unknown fields, including prototype-pollution keys", () => {
    expect(enquirySchema.safeParse({ ...valid, isAdmin: true }).success).toBe(false);
    const polluted = JSON.parse(
      `{"firstName":"A","lastName":"B","email":"a@b.co","service":"Other","message":"0123456789 hello","__proto__":{"polluted":true}}`,
    );
    expect(enquirySchema.safeParse(polluted).success).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    const ctor = JSON.parse(
      `{"firstName":"A","lastName":"B","email":"a@b.co","service":"Other","message":"0123456789 hello","constructor":{"prototype":{"x":1}}}`,
    );
    expect(enquirySchema.safeParse(ctor).success).toBe(false);
  });
  it.each(XSS)("rejects markup in names: %s", (payload) => {
    expect(enquirySchema.safeParse({ ...valid, firstName: payload }).success).toBe(false);
  });
  it.each(SQLI.filter((p) => /[;=(){}$*"]/.test(p)))(
    "rejects injection-style names: %s",
    (payload) => {
      expect(enquirySchema.safeParse({ ...valid, lastName: payload }).success).toBe(false);
    },
  );
  it("allows real names with apostrophes and dashes (there is no SQL anywhere to inject into)", () => {
    expect(enquirySchema.safeParse({ ...valid, lastName: "O'Brien-Smith" }).success).toBe(true);
  });
  it("keeps hostile message text as inert data (it is never interpreted)", () => {
    const r = enquirySchema.parse({ ...valid, message: `${XSS[0]} ${SQLI[1]}` });
    expect(r.message).toContain("<script>");
  });
  it("rejects CRLF header-injection attempts in single-line fields", () => {
    const r = enquirySchema.safeParse({ ...valid, firstName: "Asha\r\nBcc: x@evil.com" });
    expect(r.success).toBe(false);
    const e = enquirySchema.safeParse({ ...valid, email: "a@b.co\r\nBcc: x@evil.com" });
    expect(e.success).toBe(false);
  });
  it("enforces lengths", () => {
    expect(enquirySchema.safeParse({ ...valid, message: "short" }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, message: "x".repeat(2001) }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, firstName: "A".repeat(61) }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, email: `${"a".repeat(250)}@b.co` }).success).toBe(
      false,
    );
  });
  it("rejects wrong types", () => {
    expect(enquirySchema.safeParse({ ...valid, message: ["a"] }).success).toBe(false);
    expect(enquirySchema.safeParse({ ...valid, email: { $gt: "" } }).success).toBe(false);
  });
  it("produces field messages without echoing the input", () => {
    const r = enquirySchema.safeParse({ ...valid, email: "<script>not-an-email" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const fe = fieldErrors(r.error);
      expect(fe.email).toBeDefined();
      expect(fe.email).not.toContain("<script>");
    }
  });
});
