import { NextResponse } from "next/server";
import { requireGuest } from "@/lib/jobpilot/guest";
import { RATE_LIMITS, rateLimit } from "@/lib/jobpilot/rate-limit";
import { crossOriginMutationResponse } from "@/lib/jobpilot/request-guards";
import { routeErrorResponse, validationErrorResponse } from "@/lib/jobpilot/route-errors";
import {
  addActivity,
  calculateAnalytics,
  createId,
  listGuestAnalyses,
  listGuestApplications,
  listGuestQuestions,
  nowIso,
  transact,
} from "@/lib/jobpilot/store";
import { applicationSchema } from "@/lib/jobpilot/validators";

export async function GET(request: Request) {
  try {
    const limited = rateLimit(request, RATE_LIMITS.read);
    if (limited) return limited;

    const guest = await requireGuest();
    const database = await import("@/lib/jobpilot/store").then((module) => module.readDatabase());
    const applications = listGuestApplications(database, guest.id);
    const analytics = calculateAnalytics(applications);
    const analyses = listGuestAnalyses(database, guest.id);
    const questions = listGuestQuestions(database, guest.id);

    return NextResponse.json({ applications, analytics, analyses, questions });
  } catch (error) {
    return routeErrorResponse(error, "Could not load applications.");
  }
}

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, RATE_LIMITS.write);
    if (limited) return limited;
    const crossOrigin = crossOriginMutationResponse(request);
    if (crossOrigin) return crossOrigin;

    const guest = await requireGuest();
    const parsed = applicationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid application.");
    }

    const application = await transact((database) => {
      const timestamp = nowIso();
      const nextApplication = {
        id: createId("app"),
        guestId: guest.id,
        companyName: parsed.data.companyName,
        role: parsed.data.role,
        location: parsed.data.location,
        salary: parsed.data.salary ?? null,
        sourcePlatform: parsed.data.sourcePlatform,
        jobUrl: parsed.data.jobUrl,
        applicationDate: parsed.data.applicationDate,
        status: parsed.data.status,
        notes: parsed.data.notes,
        followUpDate: parsed.data.followUpDate || null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      database.applications.push(nextApplication);
      addActivity(database, {
        guestId: guest.id,
        applicationId: nextApplication.id,
        label: `Added ${nextApplication.companyName} to ${nextApplication.status}`,
      });
      return nextApplication;
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Could not create application.");
  }
}
