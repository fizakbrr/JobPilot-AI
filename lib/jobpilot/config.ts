import type { AiQuota } from "@/lib/jobpilot/types";

export const APP_CONFIG = {
  name: "JobPilot AI",
  description: "A focused career cockpit for applications, resume checks, follow-ups, and interview prep.",
  workspaceSubtitle: "Career command desk",
  guestModeTitle: "Guest mode",
  defaultGuestNamePlaceholder: "Your name",
} as const;

export const DEFAULT_DAILY_AI_ACTION_LIMIT = 3;

export function getDailyAiActionLimit() {
  const configuredLimit = Number(process.env.JOBPILOT_DAILY_AI_ACTION_LIMIT ?? DEFAULT_DAILY_AI_ACTION_LIMIT);
  if (!Number.isFinite(configuredLimit) || configuredLimit < 1) return DEFAULT_DAILY_AI_ACTION_LIMIT;
  return Math.floor(configuredLimit);
}

export function createAiQuotaSnapshot(
  limit = DEFAULT_DAILY_AI_ACTION_LIMIT,
  used = 0,
  date = new Date().toISOString().slice(0, 10),
): AiQuota {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_DAILY_AI_ACTION_LIMIT;
  const safeUsed = Math.max(0, Math.floor(used));

  return {
    limit: safeLimit,
    used: safeUsed,
    remaining: Math.max(0, safeLimit - safeUsed),
    date,
  };
}

export function normalizeAiQuota(quota: Partial<AiQuota> | null | undefined, fallbackLimit = DEFAULT_DAILY_AI_ACTION_LIMIT): AiQuota {
  const limit = Number.isFinite(quota?.limit) && Number(quota?.limit) > 0 ? Number(quota?.limit) : fallbackLimit;
  return createAiQuotaSnapshot(limit, quota?.used ?? 0, quota?.date ?? new Date().toISOString().slice(0, 10));
}

export function getQuotaProgressValue(quota: AiQuota, mode: "used" | "remaining" = "used") {
  const normalized = normalizeAiQuota(quota);
  const value = mode === "remaining" ? normalized.remaining : normalized.used;
  return Math.round((value / normalized.limit) * 100);
}
