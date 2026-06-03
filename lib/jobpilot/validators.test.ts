import { describe, expect, it } from "vitest";
import {
  applicationPatchSchema,
  applicationSchema,
  interviewPatchSchema,
} from "@/lib/jobpilot/validators";

const validApplication = {
  companyName: "Acme",
  role: "Frontend Engineer",
  location: "Remote",
  salary: 120000,
  sourcePlatform: "Referral",
  jobUrl: "https://example.com/jobs/frontend",
  applicationDate: "2026-02-28",
  status: "Applied",
  notes: "Talked with recruiter.",
  followUpDate: "2026-03-02",
};

describe("applicationSchema", () => {
  it("accepts valid leap-day dates", () => {
    const parsed = applicationSchema.safeParse({
      ...validApplication,
      applicationDate: "2024-02-29",
      followUpDate: "2024-03-01",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects impossible calendar dates", () => {
    const parsed = applicationSchema.safeParse({
      ...validApplication,
      applicationDate: "2026-02-31",
    });

    expect(parsed.success).toBe(false);
  });
});

describe("patch schemas", () => {
  it("rejects empty application patches", () => {
    expect(applicationPatchSchema.safeParse({}).success).toBe(false);
  });

  it("rejects impossible follow-up dates in application patches", () => {
    expect(applicationPatchSchema.safeParse({ followUpDate: "2026-04-31" }).success).toBe(false);
  });

  it("accepts intentional application patches", () => {
    expect(applicationPatchSchema.safeParse({ notes: "Send portfolio link." }).success).toBe(true);
  });

  it("rejects empty interview patches", () => {
    expect(interviewPatchSchema.safeParse({}).success).toBe(false);
  });

  it("accepts intentional interview patches", () => {
    expect(interviewPatchSchema.safeParse({ answerNotes: "Use STAR format." }).success).toBe(true);
  });
});
