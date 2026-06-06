import { NextResponse } from "next/server";
import { requireGuest } from "@/lib/jobpilot/guest";
import { RATE_LIMITS, rateLimit } from "@/lib/jobpilot/rate-limit";
import { crossOriginMutationResponse } from "@/lib/jobpilot/request-guards";
import { routeErrorResponse, validationErrorResponse } from "@/lib/jobpilot/route-errors";
import { nowIso, transact } from "@/lib/jobpilot/store";
import { idSchema, interviewPatchSchema } from "@/lib/jobpilot/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const limited = rateLimit(request, RATE_LIMITS.write);
    if (limited) return limited;
    const crossOrigin = crossOriginMutationResponse(request);
    if (crossOrigin) return crossOrigin;

    const guest = await requireGuest();
    const { id: rawId } = await context.params;
    const parsedId = idSchema.safeParse(rawId);
    if (!parsedId.success) return validationErrorResponse("Invalid question id.");
    const id = parsedId.data;
    const parsed = interviewPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid question update.");
    }

    const question = await transact((database) => {
      const target = database.interviewQuestions.find((item) => item.id === id && item.guestId === guest.id);
      if (!target) return null;

      Object.assign(target, {
        ...parsed.data,
        updatedAt: nowIso(),
      });
      return target;
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    return NextResponse.json({ question });
  } catch (error) {
    return routeErrorResponse(error, "Could not update question.");
  }
}
