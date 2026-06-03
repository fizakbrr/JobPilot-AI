import { NextResponse } from "next/server";
import { generateInterviewQuestionsWithAI, toInterviewRecords } from "@/lib/jobpilot/ai";
import { requireGuest } from "@/lib/jobpilot/guest";
import { RATE_LIMITS, rateLimit, rateLimitByKey } from "@/lib/jobpilot/rate-limit";
import { routeErrorResponse, validationErrorResponse } from "@/lib/jobpilot/route-errors";
import {
  addActivity,
  consumeAiQuotaForSubjects,
  getAiQuota,
  refundAiQuotaForSubjects,
  transact,
} from "@/lib/jobpilot/store";
import { interviewGenerateSchema } from "@/lib/jobpilot/validators";
import { buildAiQuotaSubjects, getOrCreateVisitorId, visitorSubjectId } from "@/lib/jobpilot/visitor";

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, RATE_LIMITS.ai);
    if (limited) return limited;

    const visitorId = await getOrCreateVisitorId();
    const visitorLimited = rateLimitByKey(`visitor:${visitorId}`, RATE_LIMITS.ai);
    if (visitorLimited) return visitorLimited;

    const guest = await requireGuest();
    const parsed = interviewGenerateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid interview request.");
    }

    const quotaSubjects = buildAiQuotaSubjects(request, visitorId);
    const quotaCheck = await transact((database) => {
      const application = database.applications.find(
        (item) => item.id === parsed.data.applicationId && item.guestId === guest.id,
      );
      if (!application) {
        return {
          allowed: false as const,
          missingApplication: true as const,
          quota: getAiQuota(database, visitorSubjectId(visitorId)),
        };
      }
      return { ...consumeAiQuotaForSubjects(database, quotaSubjects), application };
    });

    if ("missingApplication" in quotaCheck) {
      return NextResponse.json({ error: "Application not found." }, { status: 404 });
    }

    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { error: "Daily AI limit reached. You can keep tracking applications and come back tomorrow for more AI help.", quota: quotaCheck.quota },
        { status: 429 },
      );
    }

    const generation = await generateInterviewQuestionsWithAI(quotaCheck.application);
    const quota = generation.usedModel
      ? quotaCheck.quota
      : await transact((database) => refundAiQuotaForSubjects(database, quotaSubjects, quotaCheck.quota.date));
    const records = toInterviewRecords(guest.id, quotaCheck.application.id, generation.data);

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

    return NextResponse.json({ ...result, quota });
  } catch (error) {
    return routeErrorResponse(error, "Could not generate interview questions.");
  }
}
