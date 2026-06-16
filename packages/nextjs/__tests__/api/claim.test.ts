import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/claim/route";
import * as blockchain from "@/services/blockchain.service";
import * as db from "@/services/database.service";

vi.mock("@/lib/auth/getVerifiedFid", () => ({
  getVerifiedFid: vi.fn().mockResolvedValue(123),
  UnauthorizedError: class UnauthorizedError extends Error {},
}));

const mockGetUserByFid = vi.fn();
const mockDidUserLikeCast = vi.fn();
const mockPublishCast = vi.fn();

vi.mock("@/lib/social", () => ({
  getSocialDataProvider: () => ({
    getUserByFid: mockGetUserByFid,
    didUserLikeCast: mockDidUserLikeCast,
    publishCast: mockPublishCast,
  }),
}));

vi.mock("@/services/database.service", () => ({
  findCampaignById: vi.fn(),
  hasUserMinted: vi.fn(),
  getMintCount: vi.fn(),
  reserveMint: vi.fn(),
  finalizeMint: vi.fn(),
  failMint: vi.fn(),
}));

vi.mock("@/services/blockchain.service", () => ({
  mintNFT: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockBlockchain = vi.mocked(blockchain);

const mockCampaign = {
  id: 1,
  name: "Test Campaign",
  target_cast_hash: "0xabc123",
  max_mints: 100,
  is_active: true,
  creator_address: "0xcreator",
  created_at: new Date(),
};

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: "Bearer test" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/claim", () => {
  it("returns 404 when campaign not found", async () => {
    mockDb.findCampaignById.mockResolvedValue(null);
    const res = await POST(makeRequest({ campaignId: 999 }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when user data not found", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockGetUserByFid.mockResolvedValue(null);

    const res = await POST(makeRequest({ campaignId: 1 }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when campaign is at mint limit", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.getMintCount.mockResolvedValue(100);

    const res = await POST(makeRequest({ campaignId: 1 }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.message).toContain("mint limit");
  });

  it("returns 409 when user already minted", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDidUserLikeCast.mockResolvedValue(true);
    mockDb.reserveMint.mockRejectedValue({ code: "P2002" });

    const res = await POST(makeRequest({ campaignId: 1 }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.message).toContain("already claimed");
  });

  it("returns 403 when user has not liked the cast", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDidUserLikeCast.mockResolvedValue(false);

    const res = await POST(makeRequest({ campaignId: 1 }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.message).toContain("like");
  });

  it("mints NFT on successful flow", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDidUserLikeCast.mockResolvedValue(true);
    mockDb.reserveMint.mockResolvedValue({ id: 99 } as any);
    mockBlockchain.mintNFT.mockResolvedValue({ success: true, tokenId: 7, hash: "0xtxhash" as `0x${string}` });
    mockDb.finalizeMint.mockResolvedValue(undefined as any);
    mockPublishCast.mockResolvedValue({ success: true, hash: "0xcast" });

    const res = await POST(makeRequest({ campaignId: 1 }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.tokenId).toBe(7);
    expect(json.transactionHash).toBe("0xtxhash");

    expect(mockBlockchain.mintNFT).toHaveBeenCalledWith("0xuser");
    expect(mockDb.reserveMint).toHaveBeenCalledWith(1, "0xuser", 123);
    expect(mockDb.finalizeMint).toHaveBeenCalledWith(99, 7);
    expect(mockPublishCast).toHaveBeenCalled();
  });

  it("returns 500 when mint transaction fails", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDidUserLikeCast.mockResolvedValue(true);
    mockDb.reserveMint.mockResolvedValue({ id: 99 } as any);
    mockDb.failMint.mockResolvedValue(undefined as any);
    mockBlockchain.mintNFT.mockResolvedValue({ success: false, tokenId: -1, hash: "0x" as `0x${string}` });

    const res = await POST(makeRequest({ campaignId: 1 }));
    expect(res.status).toBe(500);
  });
});
