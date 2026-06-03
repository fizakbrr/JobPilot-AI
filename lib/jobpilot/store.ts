import "server-only";

import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createAiQuotaSnapshot, getDailyAiActionLimit } from "@/lib/jobpilot/config";
import {
  APPLICATION_STATUSES,
  type ActivityEvent,
  type AiUsage,
  type AiQuota,
  type Application,
  type ApplicationStatus,
  type DashboardAnalytics,
  type Guest,
  type InterviewQuestion,
  type JobPilotDatabase,
  type ResumeAnalysis,
} from "@/lib/jobpilot/types";

const dataDirectory =
  process.env.JOBPILOT_DATA_DIR || (process.env.VERCEL ? path.join("/tmp", "jobpilot") : path.join(process.cwd(), "data"));
const dataPath = path.join(dataDirectory, "jobpilot.json");

const emptyDatabase: JobPilotDatabase = {
  guests: [],
  applications: [],
  resumeAnalyses: [],
  interviewQuestions: [],
  activityEvents: [],
  aiUsage: [],
};

type LegacyAiUsage = Partial<AiUsage> & {
  guestId?: string;
};

function cloneEmptyDatabase(): JobPilotDatabase {
  return JSON.parse(JSON.stringify(emptyDatabase)) as JobPilotDatabase;
}

function aiUsageScope(subjectId: string): AiUsage["scope"] {
  if (subjectId.startsWith("ip:")) return "ip";
  if (subjectId.startsWith("guest:")) return "guest";
  return "visitor";
}

function normalizeAiUsage(input: unknown): AiUsage[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const record = item as LegacyAiUsage;
      const legacyGuestId = typeof record.guestId === "string" ? record.guestId : "";
      const subjectId = typeof record.subjectId === "string" ? record.subjectId : legacyGuestId ? `guest:${legacyGuestId}` : "";
      const date = typeof record.date === "string" ? record.date : "";
      const count = Number(record.count ?? 0);

      if (!subjectId || !date || !Number.isFinite(count)) return null;

      return {
        subjectId,
        scope: record.scope ?? aiUsageScope(subjectId),
        date,
        count: Math.max(0, Math.floor(count)),
      };
    })
    .filter((item): item is AiUsage => Boolean(item));
}

function normalizeDatabase(input: unknown): JobPilotDatabase {
  if (!input || typeof input !== "object") return cloneEmptyDatabase();
  const database = { ...cloneEmptyDatabase(), ...(input as Partial<JobPilotDatabase>) };
  database.guests = database.guests.map((guest) => ({
    ...guest,
    onboardingCompletedAt: guest.onboardingCompletedAt ?? null,
  }));
  database.aiUsage = normalizeAiUsage((input as Partial<JobPilotDatabase>).aiUsage);
  return database;
}

async function ensureDatabase() {
  await fs.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.access(dataPath);
  } catch {
    await fs.writeFile(dataPath, JSON.stringify(cloneEmptyDatabase(), null, 2), "utf8");
  }
}

export async function readDatabase(): Promise<JobPilotDatabase> {
  await ensureDatabase();
  const raw = await fs.readFile(dataPath, "utf8");
  return normalizeDatabase(JSON.parse(raw));
}

export async function writeDatabase(database: JobPilotDatabase) {
  await ensureDatabase();
  const temporaryPath = path.join(dataDirectory, `.jobpilot.${randomUUID()}.tmp`);
  const serialized = JSON.stringify(normalizeDatabase(database), null, 2);

  try {
    await fs.writeFile(temporaryPath, serialized, "utf8");
    await fs.rename(temporaryPath, dataPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

export async function deleteGuestWorkspace(guestId: string) {
  return transact((database) => {
    const hadGuest = database.guests.some((guest) => guest.id === guestId);

    database.guests = database.guests.filter((guest) => guest.id !== guestId);
    database.applications = database.applications.filter((application) => application.guestId !== guestId);
    database.resumeAnalyses = database.resumeAnalyses.filter((analysis) => analysis.guestId !== guestId);
    database.interviewQuestions = database.interviewQuestions.filter((question) => question.guestId !== guestId);
    database.activityEvents = database.activityEvents.filter((event) => event.guestId !== guestId);

    return hadGuest;
  });
}

let transactionQueue: Promise<unknown> = Promise.resolve();

export async function transact<T>(callback: (database: JobPilotDatabase) => T | Promise<T>) {
  const queuedTransaction = transactionQueue.then(async () => {
    const database = await readDatabase();
    const result = await callback(database);
    await writeDatabase(database);
    return result;
  });

  transactionQueue = queuedTransaction.catch(() => undefined);
  return queuedTransaction;
}

export function nowIso() {
  return new Date().toISOString();
}

export function createId(prefix: string) {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export async function getGuestById(guestId: string) {
  const database = await readDatabase();
  return database.guests.find((guest) => guest.id === guestId) ?? null;
}

export async function createGuest(name: string) {
  return transact((database) => {
    const timestamp = nowIso();
    const guest: Guest = {
      id: createId("gst"),
      name,
      onboardingCompletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    database.guests.push(guest);
    return guest;
  });
}

export async function completeGuestOnboarding(guestId: string) {
  return transact((database) => {
    const guest = database.guests.find((item) => item.id === guestId);
    if (!guest) return null;
    guest.onboardingCompletedAt = guest.onboardingCompletedAt ?? nowIso();
    guest.updatedAt = nowIso();
    return guest;
  });
}

export async function updateGuestName(guestId: string, name: string) {
  return transact((database) => {
    const guest = database.guests.find((item) => item.id === guestId);
    if (!guest) return null;
    guest.name = name;
    guest.updatedAt = nowIso();
    return guest;
  });
}

export function addActivity(database: JobPilotDatabase, input: Omit<ActivityEvent, "id" | "createdAt">) {
  database.activityEvents.unshift({
    ...input,
    id: createId("evt"),
    createdAt: nowIso(),
  });
}

export function listGuestApplications(database: JobPilotDatabase, guestId: string) {
  return database.applications
    .filter((application) => application.guestId === guestId)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function listGuestAnalyses(database: JobPilotDatabase, guestId: string) {
  return database.resumeAnalyses
    .filter((analysis) => analysis.guestId === guestId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function listGuestQuestions(database: JobPilotDatabase, guestId: string) {
  return database.interviewQuestions
    .filter((question) => question.guestId === guestId)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function listApplicationEvents(database: JobPilotDatabase, guestId: string, applicationId: string) {
  return database.activityEvents
    .filter((event) => event.guestId === guestId && event.applicationId === applicationId)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function calculateAnalytics(applications: Application[]): DashboardAnalytics {
  const byStatus = APPLICATION_STATUSES.reduce(
    (accumulator, status) => ({ ...accumulator, [status]: 0 }),
    {} as Record<ApplicationStatus, number>,
  );

  for (const application of applications) {
    byStatus[application.status] += 1;
  }

  const totalApplications = applications.length;
  const interviewCount =
    byStatus["Technical Interview"] + byStatus["HR Interview"] + byStatus.Offer;
  const weekAgo = Date.now() - 1000 * 60 * 60 * 24 * 7;
  const applicationsThisWeek = applications.filter(
    (application) => Date.parse(application.applicationDate) >= weekAgo,
  ).length;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  return {
    totalApplications,
    applicationsThisWeek,
    interviewRate: totalApplications ? Math.round((interviewCount / totalApplications) * 100) : 0,
    offerRate: totalApplications ? Math.round((byStatus.Offer / totalApplications) * 100) : 0,
    rejectedCount: byStatus.Rejected,
    overdueFollowUps: applications.filter(
      (application) =>
        application.followUpDate &&
        Date.parse(application.followUpDate) < todayStart.getTime() &&
        application.status !== "Rejected" &&
        application.status !== "Offer",
    ).length,
    byStatus,
  };
}

export function applicationFollowUpState(application: Application) {
  if (!application.followUpDate) return "none";

  const followUpDate = new Date(application.followUpDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  if (followUpDate < today) return "overdue";
  if (followUpDate <= threeDaysFromNow) return "upcoming";
  return "scheduled";
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function getAiQuota(database: JobPilotDatabase, subjectId: string, limit = getDailyAiActionLimit()): AiQuota {
  const date = todayKey();
  const usage = database.aiUsage.find((item) => item.subjectId === subjectId && item.date === date);
  const used = usage?.count ?? 0;
  return createAiQuotaSnapshot(limit, used, date);
}

function incrementAiUsage(database: JobPilotDatabase, subjectId: string, date: string) {
  let usage = database.aiUsage.find((item) => item.subjectId === subjectId && item.date === date);
  if (!usage) {
    usage = { subjectId, scope: aiUsageScope(subjectId), date, count: 0 };
    database.aiUsage.push(usage);
  }
  usage.count += 1;
}

function decrementAiUsage(database: JobPilotDatabase, subjectId: string, date: string) {
  const usage = database.aiUsage.find((item) => item.subjectId === subjectId && item.date === date);
  if (!usage) return;
  usage.count = Math.max(0, usage.count - 1);
}

export function consumeAiQuota(database: JobPilotDatabase, subjectId: string, limit = getDailyAiActionLimit()) {
  const quota = getAiQuota(database, subjectId, limit);
  if (quota.remaining <= 0) return { allowed: false, quota };

  incrementAiUsage(database, subjectId, quota.date);

  return { allowed: true, quota: getAiQuota(database, subjectId, limit) };
}

export function consumeAiQuotaForSubjects(
  database: JobPilotDatabase,
  subjects: { subjectId: string; limit: number }[],
) {
  const [primarySubject] = subjects;
  if (!primarySubject) {
    return { allowed: false as const, quota: createAiQuotaSnapshot(getDailyAiActionLimit()) };
  }

  const quotas = subjects.map((subject) => ({
    ...subject,
    quota: getAiQuota(database, subject.subjectId, subject.limit),
  }));
  const blockedQuota = quotas.find((item) => item.quota.remaining <= 0);
  const primaryQuota = quotas[0].quota;

  if (blockedQuota) {
    return {
      allowed: false as const,
      quota: createAiQuotaSnapshot(primaryQuota.limit, primaryQuota.limit, primaryQuota.date),
      blockedBy: blockedQuota.subjectId,
    };
  }

  for (const subject of subjects) {
    incrementAiUsage(database, subject.subjectId, todayKey());
  }

  return {
    allowed: true as const,
    quota: getAiQuota(database, primarySubject.subjectId, primarySubject.limit),
  };
}

export function refundAiQuotaForSubjects(
  database: JobPilotDatabase,
  subjects: { subjectId: string; limit: number }[],
  date = todayKey(),
) {
  const [primarySubject] = subjects;

  for (const subject of subjects) {
    decrementAiUsage(database, subject.subjectId, date);
  }

  return primarySubject
    ? getAiQuota(database, primarySubject.subjectId, primarySubject.limit)
    : createAiQuotaSnapshot(getDailyAiActionLimit(), 0, date);
}

export type ApplicationDetailBundle = {
  application: Application;
  events: ActivityEvent[];
  analyses: ResumeAnalysis[];
  questions: InterviewQuestion[];
};
