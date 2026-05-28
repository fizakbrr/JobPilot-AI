import "server-only";

import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createAiQuotaSnapshot, getDailyAiActionLimit } from "@/lib/jobpilot/config";
import {
  APPLICATION_STATUSES,
  type ActivityEvent,
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

function cloneEmptyDatabase(): JobPilotDatabase {
  return JSON.parse(JSON.stringify(emptyDatabase)) as JobPilotDatabase;
}

function normalizeDatabase(input: unknown): JobPilotDatabase {
  if (!input || typeof input !== "object") return cloneEmptyDatabase();
  return { ...cloneEmptyDatabase(), ...(input as Partial<JobPilotDatabase>) };
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
  await fs.writeFile(dataPath, JSON.stringify(normalizeDatabase(database), null, 2), "utf8");
}

export async function resetDatabase() {
  await ensureDatabase();
  await fs.writeFile(dataPath, JSON.stringify(cloneEmptyDatabase(), null, 2), "utf8");
}

export async function transact<T>(callback: (database: JobPilotDatabase) => T | Promise<T>) {
  const database = await readDatabase();
  const result = await callback(database);
  await writeDatabase(database);
  return result;
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
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    database.guests.push(guest);
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

export function getAiQuota(database: JobPilotDatabase, guestId: string): AiQuota {
  const date = todayKey();
  const usage = database.aiUsage.find((item) => item.guestId === guestId && item.date === date);
  const used = usage?.count ?? 0;
  return createAiQuotaSnapshot(getDailyAiActionLimit(), used, date);
}

export function consumeAiQuota(database: JobPilotDatabase, guestId: string) {
  const quota = getAiQuota(database, guestId);
  if (quota.remaining <= 0) return { allowed: false, quota };

  let usage = database.aiUsage.find((item) => item.guestId === guestId && item.date === quota.date);
  if (!usage) {
    usage = { guestId, date: quota.date, count: 0 };
    database.aiUsage.push(usage);
  }
  usage.count += 1;

  return { allowed: true, quota: getAiQuota(database, guestId) };
}

export type ApplicationDetailBundle = {
  application: Application;
  events: ActivityEvent[];
  analyses: ResumeAnalysis[];
  questions: InterviewQuestion[];
};
