import { describe, expect, it } from "vitest";
import {
  calculateAnalytics,
  consumeAiQuotaForSubjects,
  refundAiQuotaForSubjects,
} from "@/lib/jobpilot/store";
import { APPLICATION_STATUSES, type Application, type JobPilotDatabase } from "@/lib/jobpilot/types";

function createDatabase(): JobPilotDatabase {
  return {
    guests: [],
    applications: [],
    resumeAnalyses: [],
    interviewQuestions: [],
    activityEvents: [],
    aiUsage: [],
  };
}

describe("AI quota storage", () => {
  it("enforces every quota subject before allowing generation", () => {
    const database = createDatabase();
    const subjects = [
      { subjectId: "visitor:vst_test", limit: 2 },
      { subjectId: "ip:hashed_test", limit: 1 },
    ];

    const first = consumeAiQuotaForSubjects(database, subjects);
    const second = consumeAiQuotaForSubjects(database, subjects);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(database.aiUsage).toEqual([
      expect.objectContaining({ subjectId: "visitor:vst_test", count: 1 }),
      expect.objectContaining({ subjectId: "ip:hashed_test", count: 1 }),
    ]);
  });

  it("refunds every quota subject for fallback generation", () => {
    const database = createDatabase();
    const subjects = [
      { subjectId: "visitor:vst_test", limit: 2 },
      { subjectId: "ip:hashed_test", limit: 2 },
    ];

    const consumed = consumeAiQuotaForSubjects(database, subjects);
    const quota = refundAiQuotaForSubjects(database, subjects, consumed.quota.date);

    expect(quota.used).toBe(0);
    expect(database.aiUsage).toEqual([
      expect.objectContaining({ subjectId: "visitor:vst_test", count: 0 }),
      expect.objectContaining({ subjectId: "ip:hashed_test", count: 0 }),
    ]);
  });
});

describe("calculateAnalytics", () => {
  it("counts active stages, offers, rejections, and overdue follow-ups", () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const applications = APPLICATION_STATUSES.slice(0, 3).map((status, index) => ({
      id: `app_${String(index).padStart(16, "0")}`,
      guestId: "gst_test",
      companyName: `Company ${index}`,
      role: "Frontend engineer",
      location: "",
      salary: null,
      sourcePlatform: "",
      jobUrl: "",
      applicationDate: today.toISOString().slice(0, 10),
      status,
      notes: "",
      followUpDate: index === 0 ? yesterday.toISOString().slice(0, 10) : null,
      createdAt: today.toISOString(),
      updatedAt: today.toISOString(),
    })) satisfies Application[];

    const analytics = calculateAnalytics(applications);

    expect(analytics.totalApplications).toBe(3);
    expect(analytics.applicationsThisWeek).toBe(3);
    expect(analytics.overdueFollowUps).toBe(1);
    expect(analytics.byStatus.Wishlist).toBe(1);
    expect(analytics.byStatus.Applied).toBe(1);
    expect(analytics.byStatus.Screening).toBe(1);
  });
});
