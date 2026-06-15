import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/claim/route";
import * as blockchain from "@/services/blockchain.service";
import * as db from "@/services/database.service";
import * as neynar from "@/services/neynar.service";

vi.mock("@/services/database.service", () => ({
  findCampaignById: vi.fn(),
  hasUserMinted: vi.fn(),
  getMintCount: vi.fn(),
  recordMint: vi.fn(),
}));

vi.mock("@/services/blockchain.service", () => ({
  mintNFT: vi.fn(),
}));

vi.mock("@/services/neynar.service", () => ({
  getUserDataFromFid: vi.fn(),
  didUserLikeCast: vi.fn(),
  publishCast: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockBlockchain = vi.mocked(blockchain);
const mockNeynar = vi.mocked(neynar);

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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/claim", () => {
  it("returns 400 when userFid is missing", async () => {
    const res = await POST(makeRequest({ campaignId: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when campaign not found", async () => {
    mockDb.findCampaignById.mockResolvedValue(null);
    const res = await POST(makeRequest({ userFid: 123, campaignId: 999 }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when user data not found", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockNeynar.getUserDataFromFid.mockResolvedValue(null);

    const res = await POST(makeRequest({ userFid: 123, campaignId: 1 }));
    expect(res.status).toBe(404);
  });

  it("returns 409 when campaign is at mint limit", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockNeynar.getUserDataFromFid.mockResolvedValue({ address: "0xuser", username: "testuser" });
    mockDb.getMintCount.mockResolvedValue(100);

    const res = await POST(makeRequest({ userFid: 123, campaignId: 1 }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.message).toContain("mint limit");
  });

  it("returns 409 when user already minted", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockNeynar.getUserDataFromFid.mockResolvedValue({ address: "0xuser", username: "testuser" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDb.hasUserMinted.mockResolvedValue(true);

    const res = await POST(makeRequest({ userFid: 123, campaignId: 1 }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.message).toContain("already claimed");
  });

  it("returns 403 when user has not liked the cast", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockNeynar.getUserDataFromFid.mockResolvedValue({ address: "0xuser", username: "testuser" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDb.hasUserMinted.mockResolvedValue(false);
    mockNeynar.didUserLikeCast.mockResolvedValue(false);

    const res = await POST(makeRequest({ userFid: 123, campaignId: 1 }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.message).toContain("like");
  });

  it("mints NFT on successful flow", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockNeynar.getUserDataFromFid.mockResolvedValue({ address: "0xuser", username: "testuser" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDb.hasUserMinted.mockResolvedValue(false);
    mockNeynar.didUserLikeCast.mockResolvedValue(true);
    mockBlockchain.mintNFT.mockResolvedValue({ success: true, tokenId: 7, hash: "0xtxhash" as `0x${string}` });
    mockDb.recordMint.mockResolvedValue(undefined);
    mockNeynar.publishCast.mockResolvedValue({ success: true, hash: "0xcast" });

    const res = await POST(makeRequest({ userFid: 123, campaignId: 1 }));
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.tokenId).toBe(7);
    expect(json.transactionHash).toBe("0xtxhash");

    expect(mockBlockchain.mintNFT).toHaveBeenCalledWith("0xuser");
    expect(mockDb.recordMint).toHaveBeenCalledWith(1, 7, "0xuser", 123);
    expect(mockNeynar.publishCast).toHaveBeenCalled();
  });

  it("returns 500 when mint transaction fails", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockNeynar.getUserDataFromFid.mockResolvedValue({ address: "0xuser", username: "testuser" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDb.hasUserMinted.mockResolvedValue(false);
    mockNeynar.didUserLikeCast.mockResolvedValue(true);
    mockBlockchain.mintNFT.mockResolvedValue({ success: false, tokenId: -1, hash: "0x" as `0x${string}` });

    const res = await POST(makeRequest({ userFid: 123, campaignId: 1 }));
    expect(res.status).toBe(500);
  });
});
