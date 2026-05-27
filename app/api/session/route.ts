import { NextResponse } from "next/server";
import { createAiQuotaSnapshot, getDailyAiActionLimit } from "@/lib/jobpilot/config";
import { createOrUpdateGuestSession, getCurrentGuest } from "@/lib/jobpilot/guest";
import { routeErrorResponse, validationErrorResponse } from "@/lib/jobpilot/route-errors";
import { getAiQuota, readDatabase } from "@/lib/jobpilot/store";
import { guestNameSchema } from "@/lib/jobpilot/validators";

export async function GET() {
  try {
    const guest = await getCurrentGuest();
    const database = await readDatabase();
    const quota = guest ? getAiQuota(database, guest.id) : createAiQuotaSnapshot(getDailyAiActionLimit());

    return NextResponse.json({ guest, quota });
  } catch (error) {
    return routeErrorResponse(error, "Could not load session.");
  }
}

export async function POST(request: Request) {
  try {
    const parsed = guestNameSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? "Enter your name.");
    }

    const guest = await createOrUpdateGuestSession(parsed.data.name);
    const database = await readDatabase();
    const quota = getAiQuota(database, guest.id);

    return NextResponse.json({ guest, quota });
  } catch (error) {
    return routeErrorResponse(error, "Could not save session.");
  }
}
