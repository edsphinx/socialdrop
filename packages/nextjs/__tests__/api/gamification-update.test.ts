import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/gamification/update/route";
import * as blockchain from "@/services/blockchain.service";
import * as db from "@/services/database.service";

vi.mock("@/lib/auth/getVerifiedFid", () => ({
  getVerifiedFid: vi.fn().mockResolvedValue(123),
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

const mockGetUserByFid = vi.fn();
const mockGetLikes = vi.fn();
const mockPublishCast = vi.fn();

vi.mock("@/lib/social", () => ({
  getSocialDataProvider: () => ({
    getUserByFid: mockGetUserByFid,
    getCastLikesCount: mockGetLikes,
    publishCast: mockPublishCast,
  }),
}));

vi.mock("@/services/database.service", () => ({
  findGamificationEntry: vi.fn(),
  updateGamificationScore: vi.fn(),
  findUserMint: vi.fn(),
  updateMintLevel: vi.fn(),
  findCampaignById: vi.fn(),
}));

vi.mock("@/services/blockchain.service", () => ({
  evolveNFT: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockBlockchain = vi.mocked(blockchain);

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/gamification/update", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer test" },
    body: JSON.stringify(body),
  });
}

const mockGameScore = {
  id: 10,
  campaign_id: 1,
  nft_holder_address: "0xuser",
  nft_holder_fid: 123,
  tracked_cast_hash: "0xcast123",
  score: 5,
};

const mockMint = {
  id: 1,
  campaign_id: 1,
  token_id: 42,
  recipient_address: "0xuser",
  level: 1,
  minted_at: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/gamification/update", () => {
  it("returns 400 when campaignId is missing", async () => {
    const res = await POST(makeRequest({}) as any);
    expect(res.status).toBe(400);
  });

  it("returns 404 when user wallet not found", async () => {
    mockGetUserByFid.mockResolvedValue(null);

    const res = await POST(makeRequest({ campaignId: 1 }) as any);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("wallet");
  });

  it("returns 404 when no gamification entry exists", async () => {
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.findGamificationEntry.mockResolvedValue(null);

    const res = await POST(makeRequest({ campaignId: 1 }) as any);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toContain("Register");
  });

  it("updates score without evolving when below threshold", async () => {
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.findGamificationEntry.mockResolvedValue(mockGameScore as any);
    mockGetLikes.mockResolvedValue(7); // below level 2 threshold of 10
    mockDb.updateGamificationScore.mockResolvedValue({} as any);
    mockDb.findUserMint.mockResolvedValue(mockMint as any);

    const res = await POST(makeRequest({ campaignId: 1 }) as any);
    const json = await res.json();

    expect(json.score).toBe(7);
    expect(json.level).toBe(1);
    expect(json.evolved).toBe(false);
    expect(mockBlockchain.evolveNFT).not.toHaveBeenCalled();
  });

  it("evolves NFT when score reaches threshold (level 1 -> 2)", async () => {
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.findGamificationEntry.mockResolvedValue(mockGameScore as any);
    mockGetLikes.mockResolvedValue(12); // above level 2 threshold of 10
    mockDb.updateGamificationScore.mockResolvedValue({} as any);
    mockDb.findUserMint.mockResolvedValue(mockMint as any);
    mockBlockchain.evolveNFT.mockResolvedValue({ success: true, hash: "0xtx" as `0x${string}` });
    mockDb.updateMintLevel.mockResolvedValue({} as any);
    mockDb.findCampaignById.mockResolvedValue({ id: 1, name: "Test Campaign" } as any);
    mockPublishCast.mockResolvedValue({ success: true, hash: "0xcast" });

    const res = await POST(makeRequest({ campaignId: 1 }) as any);
    const json = await res.json();

    expect(json.score).toBe(12);
    expect(json.level).toBe(2);
    expect(json.evolved).toBe(true);

    // Contract evolve called once (1 level jump)
    expect(mockBlockchain.evolveNFT).toHaveBeenCalledTimes(1);
    expect(mockBlockchain.evolveNFT).toHaveBeenCalledWith(42);
    expect(mockDb.updateMintLevel).toHaveBeenCalledWith(1, 2);
    expect(mockPublishCast).toHaveBeenCalled();
  });

  // --- MULTI-LEVEL JUMP TESTS (previously broken) ---

  it("evolves from level 1 -> 3 in one call when score is 30 (calls evolve twice)", async () => {
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.findGamificationEntry.mockResolvedValue(mockGameScore as any);
    mockGetLikes.mockResolvedValue(30); // >= 25 for level 3
    mockDb.updateGamificationScore.mockResolvedValue({} as any);
    mockDb.findUserMint.mockResolvedValue(mockMint as any); // currently at level 1
    mockBlockchain.evolveNFT.mockResolvedValue({ success: true, hash: "0xtx" as `0x${string}` });
    mockDb.updateMintLevel.mockResolvedValue({} as any);
    mockDb.findCampaignById.mockResolvedValue({ id: 1, name: "Test" } as any);
    mockPublishCast.mockResolvedValue({ success: true, hash: "0xcast" });

    const res = await POST(makeRequest({ campaignId: 1 }) as any);
    const json = await res.json();

    expect(json.level).toBe(3);
    expect(json.evolved).toBe(true);
    // Contract evolve called TWICE (level 1->2->3)
    expect(mockBlockchain.evolveNFT).toHaveBeenCalledTimes(2);
    expect(mockDb.updateMintLevel).toHaveBeenCalledWith(1, 3);
  });

  it("evolves from level 1 -> 4 in one call when score is 50 (calls evolve 3 times)", async () => {
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.findGamificationEntry.mockResolvedValue(mockGameScore as any);
    mockGetLikes.mockResolvedValue(50);
    mockDb.updateGamificationScore.mockResolvedValue({} as any);
    mockDb.findUserMint.mockResolvedValue(mockMint as any);
    mockBlockchain.evolveNFT.mockResolvedValue({ success: true, hash: "0xtx" as `0x${string}` });
    mockDb.updateMintLevel.mockResolvedValue({} as any);
    mockDb.findCampaignById.mockResolvedValue({ id: 1, name: "Test" } as any);
    mockPublishCast.mockResolvedValue({ success: true, hash: "0xcast" });

    const res = await POST(makeRequest({ campaignId: 1 }) as any);
    const json = await res.json();

    expect(json.level).toBe(4);
    expect(json.evolved).toBe(true);
    expect(mockBlockchain.evolveNFT).toHaveBeenCalledTimes(3);
  });

  it("handles partial evolution failure (evolves 1 of 3 levels, then chain fails)", async () => {
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.findGamificationEntry.mockResolvedValue(mockGameScore as any);
    mockGetLikes.mockResolvedValue(50); // should go 1->4 = 3 jumps
    mockDb.updateGamificationScore.mockResolvedValue({} as any);
    mockDb.findUserMint.mockResolvedValue(mockMint as any);

    // First evolve succeeds, second fails
    mockBlockchain.evolveNFT
      .mockResolvedValueOnce({ success: true, hash: "0xtx1" as `0x${string}` })
      .mockResolvedValueOnce({ success: false, hash: "0x" as `0x${string}` });

    mockDb.updateMintLevel.mockResolvedValue({} as any);
    mockDb.findCampaignById.mockResolvedValue({ id: 1, name: "Test" } as any);
    mockPublishCast.mockResolvedValue({ success: true, hash: "0xcast" });

    const res = await POST(makeRequest({ campaignId: 1 }) as any);
    const json = await res.json();

    // Partially evolved: made it from level 1 to level 2 (1 successful jump)
    expect(json.level).toBe(2);
    expect(json.evolved).toBe(true);
    expect(mockBlockchain.evolveNFT).toHaveBeenCalledTimes(2); // tried 2, 1st succeeded, 2nd failed
    expect(mockDb.updateMintLevel).toHaveBeenCalledWith(1, 2); // saved partial progress
  });

  // --- Other cases ---

  it("does not evolve when already at max level", async () => {
    const maxLevelMint = { ...mockMint, level: 4 };
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.findGamificationEntry.mockResolvedValue(mockGameScore as any);
    mockGetLikes.mockResolvedValue(999);
    mockDb.updateGamificationScore.mockResolvedValue({} as any);
    mockDb.findUserMint.mockResolvedValue(maxLevelMint as any);

    const res = await POST(makeRequest({ campaignId: 1 }) as any);
    const json = await res.json();

    expect(json.level).toBe(4);
    expect(json.evolved).toBe(false);
    expect(mockBlockchain.evolveNFT).not.toHaveBeenCalled();
  });

  it("returns score with level 1 when no mint found", async () => {
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.findGamificationEntry.mockResolvedValue(mockGameScore as any);
    mockGetLikes.mockResolvedValue(8);
    mockDb.updateGamificationScore.mockResolvedValue({} as any);
    mockDb.findUserMint.mockResolvedValue(null);

    const res = await POST(makeRequest({ campaignId: 1 }) as any);
    const json = await res.json();

    expect(json.score).toBe(8);
    expect(json.level).toBe(1);
    expect(json.evolved).toBe(false);
  });
});
