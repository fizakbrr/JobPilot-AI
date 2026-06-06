import { NextResponse } from "next/server";
import { createAiQuotaSnapshot, getDailyAiActionLimit } from "@/lib/jobpilot/config";
import { createOrUpdateGuestSession, getCurrentGuest, requireGuest } from "@/lib/jobpilot/guest";
import { RATE_LIMITS, rateLimit } from "@/lib/jobpilot/rate-limit";
import { crossOriginMutationResponse } from "@/lib/jobpilot/request-guards";
import { routeErrorResponse, validationErrorResponse } from "@/lib/jobpilot/route-errors";
import { completeGuestOnboarding, getAiQuota, readDatabase } from "@/lib/jobpilot/store";
import { guestNameSchema, onboardingSchema } from "@/lib/jobpilot/validators";
import { getOrCreateVisitorId, visitorSubjectId } from "@/lib/jobpilot/visitor";

export async function GET(request: Request) {
  try {
    const limited = rateLimit(request, RATE_LIMITS.read);
    if (limited) return limited;

    const guest = await getCurrentGuest();
    const database = await readDatabase();
    const visitorId = guest ? await getOrCreateVisitorId() : null;
    const quota = visitorId
      ? getAiQuota(database, visitorSubjectId(visitorId))
      : createAiQuotaSnapshot(getDailyAiActionLimit());

    return NextResponse.json({ guest, quota });
  } catch (error) {
    return routeErrorResponse(error, "Could not load session.");
  }
}

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, RATE_LIMITS.session);
    if (limited) return limited;
    const crossOrigin = crossOriginMutationResponse(request);
    if (crossOrigin) return crossOrigin;

    const parsed = guestNameSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? "Enter your name.");
    }

    const guest = await createOrUpdateGuestSession(parsed.data.name);
    const visitorId = await getOrCreateVisitorId();
    const database = await readDatabase();
    const quota = getAiQuota(database, visitorSubjectId(visitorId));

    return NextResponse.json({ guest, quota });
  } catch (error) {
    return routeErrorResponse(error, "Could not save session.");
  }
}

export async function PATCH(request: Request) {
  try {
    const limited = rateLimit(request, RATE_LIMITS.write);
    if (limited) return limited;
    const crossOrigin = crossOriginMutationResponse(request);
    if (crossOrigin) return crossOrigin;

    const guest = await requireGuest();
    const parsed = onboardingSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid session update.");
    }

    const updatedGuest = await completeGuestOnboarding(guest.id);
    if (!updatedGuest) {
      return NextResponse.json({ error: "Guest not found." }, { status: 404 });
    }

    const database = await readDatabase();
    const visitorId = await getOrCreateVisitorId();
    const quota = getAiQuota(database, visitorSubjectId(visitorId));

    return NextResponse.json({ guest: updatedGuest, quota });
  } catch (error) {
    return routeErrorResponse(error, "Could not update session.");
  }
}
