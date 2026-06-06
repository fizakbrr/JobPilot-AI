import { describe, expect, it } from "vitest";
import { routeErrorResponse } from "@/lib/jobpilot/route-errors";

describe("routeErrorResponse", () => {
  it("returns a client error for malformed JSON", async () => {
    const response = routeErrorResponse(new SyntaxError("Unexpected token"), "Could not save session.");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON request body." });
  });

  it("keeps generic route failures internal", async () => {
    const response = routeErrorResponse(new Error("disk failed"), "Could not save session.");

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Could not save session." });
  });
});
