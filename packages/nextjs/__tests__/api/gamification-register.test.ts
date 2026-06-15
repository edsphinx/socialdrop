import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "~~/app/api/gamification/register/route";
import * as db from "~~/services/database.service";
import * as neynar from "~~/services/neynar.service";

vi.mock("~~/services/database.service", () => ({
  findUserMint: vi.fn(),
  registerForGamification: vi.fn(),
}));

vi.mock("~~/services/neynar.service", () => ({
  getUserDataFromFid: vi.fn(),
  getCastLikesCount: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockNeynar = vi.mocked(neynar);

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/gamification/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/gamification/register", () => {
  it("returns 400 when userFid is missing", async () => {
    const res = await POST(makeRequest({ campaignId: 1, castHash: "0x123" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when campaignId is missing", async () => {
    const res = await POST(makeRequest({ userFid: 123, castHash: "0x123" }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 400 when castHash is missing", async () => {
    const res = await POST(makeRequest({ userFid: 123, campaignId: 1 }) as any);
    expect(res.status).toBe(400);
  });

  it("returns 404 when user wallet not found", async () => {
    mockNeynar.getUserDataFromFid.mockResolvedValue(null);

    const res = await POST(makeRequest({ userFid: 123, campaignId: 1, castHash: "0xcast" }) as any);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("wallet");
  });

  it("returns 403 when user has not minted NFT for campaign", async () => {
    mockNeynar.getUserDataFromFid.mockResolvedValue({ address: "0xuser", username: "testuser" });
    mockDb.findUserMint.mockResolvedValue(null);

    const res = await POST(makeRequest({ userFid: 123, campaignId: 1, castHash: "0xcast" }) as any);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toContain("claim an NFT");
  });

  it("registers successfully with initial score", async () => {
    mockNeynar.getUserDataFromFid.mockResolvedValue({ address: "0xuser", username: "testuser" });
    mockDb.findUserMint.mockResolvedValue({
      id: 1,
      campaign_id: 1,
      token_id: 42,
      recipient_address: "0xuser",
      level: 1,
      minted_at: new Date(),
    } as any);
    mockNeynar.getCastLikesCount.mockResolvedValue(5);
    mockDb.registerForGamification.mockResolvedValue({} as any);

    const res = await POST(makeRequest({ userFid: 123, campaignId: 1, castHash: "0xcast" }) as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.score).toBe(5);
    expect(mockDb.registerForGamification).toHaveBeenCalledWith(1, "0xuser", 123, "0xcast", 5);
  });
});
