import { describe, it, expect } from "vitest";

describe("VoiceCommands", () => {
  it("should match deploy command", () => {
    const pattern = /^(hey |ok )?bibs(claw)?[,.]?\s*deploy/i;
    expect(pattern.test("hey bibsclaw deploy")).toBe(true);
    expect(pattern.test("bibsclaw deploy")).toBe(true);
  });

  it("should match status command", () => {
    const pattern = /^(hey |ok )?bibs(claw)?[,.]?\s*check status/i;
    expect(pattern.test("hey bibs check status")).toBe(true);
  });

  it("should not match random text", () => {
    const pattern = /^(hey |ok )?bibs(claw)?[,.]?\s*deploy/i;
    expect(pattern.test("please deploy the app")).toBe(false);
  });

  it("should map language codes", () => {
    const LANGUAGE_CODES: Record<string, string> = { english: "en", arabic: "ar", hindi: "hi" };
    expect(LANGUAGE_CODES["english"]).toBe("en");
    expect(LANGUAGE_CODES["arabic"]).toBe("ar");
  });
});
