import { NextResponse } from "next/server";
import { clearGuestSession, requireGuest } from "@/lib/jobpilot/guest";
import { RATE_LIMITS, rateLimit } from "@/lib/jobpilot/rate-limit";
import { routeErrorResponse } from "@/lib/jobpilot/route-errors";
import { deleteGuestWorkspace } from "@/lib/jobpilot/store";

export async function DELETE(request: Request) {
  try {
    const limited = rateLimit(request, RATE_LIMITS.destructive);
    if (limited) return limited;

    const guest = await requireGuest();
    const deleted = await deleteGuestWorkspace(guest.id);
    if (!deleted) {
      return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    }

    await clearGuestSession();

    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeErrorResponse(error, "Could not clear local data.");
  }
}
