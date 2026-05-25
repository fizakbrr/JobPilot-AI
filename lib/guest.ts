import "server-only";

import { cookies } from "next/headers";
import { createGuest, getGuestById, updateGuestName } from "@/lib/store";

const guestCookieName = "jobpilot_guest";

export async function getCurrentGuest() {
  const cookieStore = await cookies();
  const guestId = cookieStore.get(guestCookieName)?.value;
  if (!guestId) return null;
  return getGuestById(guestId);
}

export async function requireGuest() {
  const guest = await getCurrentGuest();
  if (!guest) {
    throw new Error("Guest session required");
  }
  return guest;
}

export async function createOrUpdateGuestSession(name: string) {
  const cookieStore = await cookies();
  const existingId = cookieStore.get(guestCookieName)?.value;
  const existingGuest = existingId ? await updateGuestName(existingId, name) : null;
  const guest = existingGuest ?? (await createGuest(name));

  cookieStore.set(guestCookieName, guest.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  return guest;
}
