import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/gamification/register/route";
import * as db from "@/services/database.service";

vi.mock("@/lib/auth/getVerifiedFid", () => ({
  getVerifiedFid: vi.fn().mockResolvedValue(123),
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

const mockGetUserByFid = vi.fn();
const mockGetLikes = vi.fn();

vi.mock("@/lib/social", () => ({
  getSocialDataProvider: () => ({
    getUserByFid: mockGetUserByFid,
    getCastLikesCount: mockGetLikes,
  }),
}));

vi.mock("@/services/database.service", () => ({
  findUserMint: vi.fn(),
  registerForGamification: vi.fn(),
}));

const mockDb = vi.mocked(db);

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/gamification/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer test" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/gamification/register", () => {
  it("returns 400 when campaignId is missing", async () => {
    const res = await POST(makeRequest({ castHash: "0x123" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when castHash is missing", async () => {
    const res = await POST(makeRequest({ campaignId: 1 }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 404 when user wallet not found", async () => {
    mockGetUserByFid.mockResolvedValue(null);

    const res = await POST(makeRequest({ campaignId: 1, castHash: "0xcast" }) as any);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("wallet");
  });

  it("returns 403 when user has not minted NFT for campaign", async () => {
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.findUserMint.mockResolvedValue(null);

    const res = await POST(makeRequest({ campaignId: 1, castHash: "0xcast" }) as any);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("claim an NFT");
  });

  it("registers successfully with initial score", async () => {
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.findUserMint.mockResolvedValue({
      id: 1,
      campaign_id: 1,
      token_id: 42,
      recipient_address: "0xuser",
      level: 1,
      minted_at: new Date(),
    } as any);
    mockGetLikes.mockResolvedValue(5);
    mockDb.registerForGamification.mockResolvedValue({} as any);

    const res = await POST(makeRequest({ campaignId: 1, castHash: "0xcast" }) as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.score).toBe(5);
    expect(mockDb.registerForGamification).toHaveBeenCalledWith(1, "0xuser", 123, "0xcast", 5);
  });
});
