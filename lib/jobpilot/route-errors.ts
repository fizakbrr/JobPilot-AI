import "server-only";

import { NextResponse } from "next/server";
import { GuestSessionRequiredError } from "@/lib/jobpilot/guest";

export function routeErrorResponse(error: unknown, fallbackMessage = "Request failed.") {
  if (error instanceof GuestSessionRequiredError) {
    return NextResponse.json({ error: "Enter your name to start." }, { status: 401 });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export function validationErrorResponse(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
