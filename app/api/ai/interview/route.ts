import { NextResponse } from "next/server";
import { generateInterviewQuestionsWithAI, toInterviewRecords } from "@/lib/jobpilot/ai";
import { requireGuest } from "@/lib/jobpilot/guest";
import { routeErrorResponse, validationErrorResponse } from "@/lib/jobpilot/route-errors";
import { addActivity, consumeAiQuota, getAiQuota, transact } from "@/lib/jobpilot/store";
import { interviewGenerateSchema } from "@/lib/jobpilot/validators";

export async function POST(request: Request) {
  try {
    const guest = await requireGuest();
    const parsed = interviewGenerateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid interview request.");
    }

    const quotaCheck = await transact((database) => {
      const application = database.applications.find(
        (item) => item.id === parsed.data.applicationId && item.guestId === guest.id,
      );
      if (!application) return { allowed: false as const, missingApplication: true as const, quota: getAiQuota(database, guest.id) };
      return { ...consumeAiQuota(database, guest.id), application };
    });

    if ("missingApplication" in quotaCheck) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { error: "Daily AI limit reached. Come back tomorrow to run more AI actions.", quota: quotaCheck.quota },
        { status: 429 },
      );
    }

    const generated = await generateInterviewQuestionsWithAI(quotaCheck.application);
    const records = toInterviewRecords(guest.id, quotaCheck.application.id, generated);

    const result = await transact((database) => {
      const application = database.applications.find(
        (item) => item.id === parsed.data.applicationId && item.guestId === guest.id,
      );
      if (!application) return null;

      database.interviewQuestions = [
        ...records,
        ...database.interviewQuestions.filter(
          (question) => !(question.applicationId === application.id && question.guestId === guest.id),
        ),
      ];
      addActivity(database, {
        guestId: guest.id,
        applicationId: application.id,
        label: `Generated ${records.length} interview questions`,
      });
      return { application, questions: records };
    });

    if (!result) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    return NextResponse.json({ ...result, quota: quotaCheck.quota });
  } catch (error) {
    return routeErrorResponse(error, "Could not generate interview questions.");
  }
}
