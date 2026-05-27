import { NextResponse } from "next/server";
import { createOrUpdateGuestSession, getCurrentGuest } from "@/lib/jobpilot/guest";
import { getAiQuota, readDatabase } from "@/lib/jobpilot/store";
import { guestNameSchema } from "@/lib/jobpilot/validators";

export async function GET() {
  const guest = await getCurrentGuest();
  const database = await readDatabase();
  const quota = guest ? getAiQuota(database, guest.id) : { limit: 3, used: 0, remaining: 3, date: new Date().toISOString().slice(0, 10) };

  return NextResponse.json({ guest, quota });
}

export async function POST(request: Request) {
  const parsed = guestNameSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Enter your name." }, { status: 400 });
  }

  const guest = await createOrUpdateGuestSession(parsed.data.name);
  const database = await readDatabase();
  const quota = getAiQuota(database, guest.id);

  return NextResponse.json({ guest, quota });
}
