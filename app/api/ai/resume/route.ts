import { NextResponse } from "next/server";
import { analyzeResumeWithAI } from "@/lib/jobpilot/ai";
import { requireGuest } from "@/lib/jobpilot/guest";
import { routeErrorResponse, validationErrorResponse } from "@/lib/jobpilot/route-errors";
import { addActivity, consumeAiQuota, createId, nowIso, transact } from "@/lib/jobpilot/store";
import { resumeAnalyzeSchema } from "@/lib/jobpilot/validators";

export async function POST(request: Request) {
  try {
    const guest = await requireGuest();
    const parsed = resumeAnalyzeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid resume request.");
    }

    const quotaCheck = await transact((database) => consumeAiQuota(database, guest.id));
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        { error: "Daily AI limit reached. Come back tomorrow to run more AI actions.", quota: quotaCheck.quota },
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
