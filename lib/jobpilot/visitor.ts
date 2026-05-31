import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { getDailyAiActionLimit, getDailyAiIpLimit } from "@/lib/jobpilot/config";
import { getClientIp } from "@/lib/jobpilot/rate-limit";

const visitorCookieName = "jobpilot_visitor";
const visitorIdPattern = /^vst_[a-f0-9]{32}$/;

function createVisitorId() {
  return `vst_${randomUUID().replaceAll("-", "")}`;
}

export async function getOrCreateVisitorId() {
  const cookieStore = await cookies();
  const existingVisitorId = cookieStore.get(visitorCookieName)?.value;
  if (existingVisitorId && visitorIdPattern.test(existingVisitorId)) return existingVisitorId;

  const visitorId = createVisitorId();
  cookieStore.set(visitorCookieName, visitorId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  return visitorId;
}

export function visitorSubjectId(visitorId: string) {
  return `visitor:${visitorId}`;
}

export function ipSubjectId(request: Request) {
  const abuseSalt = process.env.JOBPILOT_ABUSE_SALT || "jobpilot-local-abuse-v1";
  const fingerprint = createHash("sha256")
    .update(`${abuseSalt}:${getClientIp(request)}`)
    .digest("hex")
    .slice(0, 32);

  return `ip:${fingerprint}`;
}

export function buildAiQuotaSubjects(request: Request, visitorId: string) {
  return [
    { subjectId: visitorSubjectId(visitorId), limit: getDailyAiActionLimit() },
    { subjectId: ipSubjectId(request), limit: getDailyAiIpLimit() },
  ];
}
