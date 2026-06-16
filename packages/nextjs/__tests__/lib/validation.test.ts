import { describe, expect, it } from "vitest";
import { claimSchema, gamificationRegisterSchema } from "@/lib/validation/schemas";

describe("validation schemas", () => {
  it("rejects a missing campaignId", () => {
    expect(claimSchema.safeParse({}).success).toBe(false);
  });
  it("accepts a valid register body", () => {
    expect(gamificationRegisterSchema.safeParse({ campaignId: 1, castHash: "0xabc" }).success).toBe(true);
  });
});
