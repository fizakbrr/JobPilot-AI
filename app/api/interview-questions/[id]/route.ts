import { NextResponse } from "next/server";
import { requireGuest } from "@/lib/jobpilot/guest";
import { nowIso, transact } from "@/lib/jobpilot/store";
import { interviewPatchSchema } from "@/lib/jobpilot/validators";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const guest = await requireGuest();
    const { id } = await context.params;
    const parsed = interviewPatchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid question update." }, { status: 400 });
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
  } catch {
    return NextResponse.json({ error: "Enter your name to start." }, { status: 401 });
  }
}
