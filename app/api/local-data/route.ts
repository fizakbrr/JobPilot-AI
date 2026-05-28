import { NextResponse } from "next/server";
import { clearGuestSession } from "@/lib/jobpilot/guest";
import { routeErrorResponse } from "@/lib/jobpilot/route-errors";
import { resetDatabase } from "@/lib/jobpilot/store";

export async function DELETE() {
  try {
    await resetDatabase();
    await clearGuestSession();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeErrorResponse(error, "Could not clear local data.");
  }
}
