import "server-only";

import { NextResponse } from "next/server";

export function crossOriginMutationResponse(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set([requestUrl.origin]);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  if (host) {
    const forwardedProtocol = request.headers.get("x-forwarded-proto");
    const protocol = forwardedProtocol ?? requestUrl.protocol.replace(/:$/, "");
    allowedOrigins.add(`${protocol}://${host}`);
  }

  if (allowedOrigins.has(origin)) return null;

  return NextResponse.json({ error: "Cross-site request blocked." }, { status: 403 });
}
