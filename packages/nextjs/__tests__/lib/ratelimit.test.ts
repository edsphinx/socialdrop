import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/ratelimit";

describe("checkRateLimit", () => {
  it("allows when Upstash is not configured (no-op)", async () => {
    expect(await checkRateLimit("fid:7")).toBe(true);
  });
});
