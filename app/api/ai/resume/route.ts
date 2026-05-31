import { NextResponse } from "next/server";
import { analyzeResumeWithAI } from "@/lib/jobpilot/ai";
import { requireGuest } from "@/lib/jobpilot/guest";
import { RATE_LIMITS, rateLimit, rateLimitByKey } from "@/lib/jobpilot/rate-limit";
import { routeErrorResponse, validationErrorResponse } from "@/lib/jobpilot/route-errors";
import { addActivity, consumeAiQuotaForSubjects, createId, getAiQuota, nowIso, transact } from "@/lib/jobpilot/store";
import { resumeAnalyzeSchema } from "@/lib/jobpilot/validators";
import { buildAiQuotaSubjects, getOrCreateVisitorId, visitorSubjectId } from "@/lib/jobpilot/visitor";

export async function POST(request: Request) {
  try {
    const limited = rateLimit(request, RATE_LIMITS.ai);
    if (limited) return limited;

    const visitorId = await getOrCreateVisitorId();
    const visitorLimited = rateLimitByKey(`visitor:${visitorId}`, RATE_LIMITS.ai);
    if (visitorLimited) return visitorLimited;

    const guest = await requireGuest();
    const parsed = resumeAnalyzeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid resume request.");
    }

    const quotaSubjects = buildAiQuotaSubjects(request, visitorId);
    const quotaCheck = await transact((database) => {
      if (parsed.data.applicationId) {
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
      }
      return consumeAiQuotaForSubjects(database, quotaSubjects);
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

    const feedback = await analyzeResumeWithAI(parsed.data.resumeText, parsed.data.jobDescription);
    const analysis = await transact((database) => {
      const record = {
        id: createId("res"),
        guestId: guest.id,
        applicationId: parsed.data.applicationId || null,
        resumeText: parsed.data.resumeText,
        jobDescription: parsed.data.jobDescription,
        ...feedback,
        createdAt: nowIso(),
      };

      database.resumeAnalyses.unshift(record);
      if (record.applicationId) {
        addActivity(database, {
          guestId: guest.id,
          applicationId: record.applicationId,
          label: `Saved resume analysis with score ${record.score}`,
        });
      }
      return record;
    });

    return NextResponse.json({ analysis, quota: quotaCheck.quota });
  } catch (error) {
    return routeErrorResponse(error, "Could not analyze resume.");
  }
}
