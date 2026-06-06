import { describe, expect, it } from "vitest";
import { crossOriginMutationResponse } from "@/lib/jobpilot/request-guards";

describe("crossOriginMutationResponse", () => {
  it("allows requests without an Origin header", () => {
    const request = new Request("https://jobpilot.test/api/applications", { method: "POST" });

    expect(crossOriginMutationResponse(request)).toBeNull();
  });

  it("allows same-origin mutations", () => {
    const request = new Request("https://jobpilot.test/api/applications", {
      method: "POST",
      headers: { origin: "https://jobpilot.test" },
    });

    expect(crossOriginMutationResponse(request)).toBeNull();
  });

  it("allows same-host mutations when the framework request URL differs", () => {
    const request = new Request("http://localhost:3000/api/applications", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3000",
        origin: "http://127.0.0.1:3000",
      },
    });

    expect(crossOriginMutationResponse(request)).toBeNull();
  });

  it("blocks cross-origin mutations", async () => {
    const request = new Request("https://jobpilot.test/api/applications", {
      method: "POST",
      headers: { origin: "https://example.test" },
    });

    const response = crossOriginMutationResponse(request);

    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({ error: "Cross-site request blocked." });
  });
});
