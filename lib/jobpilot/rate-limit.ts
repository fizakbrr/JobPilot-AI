import "server-only";

import { NextResponse } from "next/server";

type RateLimitPolicy = {
  name: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export const RATE_LIMITS = {
  read: { name: "read", limit: 180, windowMs: 60_000 },
  write: { name: "write", limit: 60, windowMs: 60_000 },
  session: { name: "session", limit: 20, windowMs: 60_000 },
  ai: { name: "ai", limit: 8, windowMs: 60_000 },
  destructive: { name: "destructive", limit: 8, windowMs: 60_000 },
} as const satisfies Record<string, RateLimitPolicy>;

export function getClientIp(request: Request) {
  const vercelIp = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();

  return vercelIp || cfIp || realIp || forwardedFor || "local";
}

function pruneExpired(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function rateLimitByKey(subjectKey: string, policy: RateLimitPolicy) {
  const now = Date.now();
  pruneExpired(now);

  const key = `${policy.name}:${subjectKey}`;
  const current = buckets.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + policy.windowMs };
  bucket.count += 1;
  buckets.set(key, bucket);

  const remaining = Math.max(0, policy.limit - bucket.count);
  const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);
  const headers = {
    "RateLimit-Limit": String(policy.limit),
    "RateLimit-Remaining": String(remaining),
    "RateLimit-Reset": String(resetSeconds),
  };

  if (bucket.count > policy.limit) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${resetSeconds} seconds.` },
      { status: 429, headers: { ...headers, "Retry-After": String(resetSeconds) } },
    );
  }

  return null;
}

export function rateLimit(request: Request, policy: RateLimitPolicy) {
  return rateLimitByKey(`ip:${getClientIp(request)}`, policy);
}
