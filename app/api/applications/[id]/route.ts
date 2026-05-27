import { NextResponse } from "next/server";
import { requireGuest } from "@/lib/jobpilot/guest";
import { routeErrorResponse, validationErrorResponse } from "@/lib/jobpilot/route-errors";
import {
  addActivity,
  listApplicationEvents,
  listGuestAnalyses,
  listGuestQuestions,
  nowIso,
  readDatabase,
  transact,
} from "@/lib/jobpilot/store";
import { applicationPatchSchema } from "@/lib/jobpilot/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const guest = await requireGuest();
    const { id } = await context.params;
    const database = await readDatabase();
    const application = database.applications.find((item) => item.id === id && item.guestId === guest.id);

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({
      application,
      events: listApplicationEvents(database, guest.id, id),
      analyses: listGuestAnalyses(database, guest.id).filter((analysis) => analysis.applicationId === id),
      questions: listGuestQuestions(database, guest.id).filter((question) => question.applicationId === id),
    });
  } catch (error) {
    return routeErrorResponse(error, "Could not load application.");
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const guest = await requireGuest();
    const { id } = await context.params;
    const parsed = applicationPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid update.");
    }

    const application = await transact((database) => {
      const target = database.applications.find((item) => item.id === id && item.guestId === guest.id);
      if (!target) return null;

      const previousStatus = target.status;
      Object.assign(target, {
        ...parsed.data,
        salary: parsed.data.salary === undefined ? target.salary : parsed.data.salary,
        followUpDate:
          parsed.data.followUpDate === undefined ? target.followUpDate : parsed.data.followUpDate || null,
        updatedAt: nowIso(),
      });

      if (parsed.data.status && parsed.data.status !== previousStatus) {
        addActivity(database, {
          guestId: guest.id,
          applicationId: target.id,
          label: `Moved from ${previousStatus} to ${parsed.data.status}`,
        });
      } else {
        addActivity(database, {
          guestId: guest.id,
          applicationId: target.id,
          label: "Updated application details",
        });
      }

      return target;
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    return routeErrorResponse(error, "Could not update application.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const guest = await requireGuest();
    const { id } = await context.params;
    const deleted = await transact((database) => {
      const before = database.applications.length;
      database.applications = database.applications.filter((item) => !(item.id === id && item.guestId === guest.id));
      database.resumeAnalyses = database.resumeAnalyses.filter(
        (item) => !(item.applicationId === id && item.guestId === guest.id),
      );
      database.interviewQuestions = database.interviewQuestions.filter(
        (item) => !(item.applicationId === id && item.guestId === guest.id),
      );
      database.activityEvents = database.activityEvents.filter(
        (item) => !(item.applicationId === id && item.guestId === guest.id),
      );
      return database.applications.length !== before;
    });

    if (!deleted) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return routeErrorResponse(error, "Could not delete application.");
  }
}
