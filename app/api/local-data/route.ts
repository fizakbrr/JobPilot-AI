import { NextResponse } from "next/server";
import { clearGuestSession } from "@/lib/jobpilot/guest";
import { RATE_LIMITS, rateLimit } from "@/lib/jobpilot/rate-limit";
import { routeErrorResponse } from "@/lib/jobpilot/route-errors";
import { resetDatabase } from "@/lib/jobpilot/store";

export async function DELETE(request: Request) {
  try {
    const limited = rateLimit(request, RATE_LIMITS.destructive);
    if (limited) return limited;

    await resetDatabase();
    await clearGuestSession();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeErrorResponse(error, "Could not clear local data.");
  }
}
