import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/neynar/route";
import { verifyWebhookSignature } from "@/lib/webhook-verify";
import * as blockchain from "@/services/blockchain.service";
import * as db from "@/services/database.service";
import * as neynar from "@/services/neynar.service";

// Mock all external services before importing the route
vi.mock("@/services/database.service", () => ({
  findCampaignByCastHash: vi.fn(),
  hasUserMinted: vi.fn(),
  getMintCount: vi.fn(),
  reserveMint: vi.fn(),
  finalizeMint: vi.fn(),
  failMint: vi.fn(),
}));

vi.mock("@/services/blockchain.service", () => ({
  mintNFT: vi.fn(),
}));

vi.mock("@/services/neynar.service", () => ({
  getUserDataFromFid: vi.fn(),
  publishCast: vi.fn(),
}));

vi.mock("@/lib/webhook-verify", () => ({
  verifyWebhookSignature: vi.fn(),
}));

const mockDb = vi.mocked(db);
const mockBlockchain = vi.mocked(blockchain);
const mockNeynar = vi.mocked(neynar);
const mockVerify = vi.mocked(verifyWebhookSignature);

function makeRequest(body: object): Request {
  return new Request("http://localhost/api/webhooks/neynar", {
    method: "POST",
    headers: { "x-neynar-signature": "test-sig" },
    body: JSON.stringify(body),
  });
}

const validWebhookBody = {
  data: {
    fid: 12345,
    cast: { hash: "0xabc123" },
  },
};

const mockCampaign = {
  id: 1,
  name: "Test Campaign",
  target_cast_hash: "0xabc123",
  max_mints: 100,
  is_active: true,
  creator_address: "0xcreator",
  created_at: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockVerify.mockReturnValue(true);
});

describe("POST /api/webhooks/neynar", () => {
  it("returns 401 when webhook signature is invalid", async () => {
    mockVerify.mockReturnValue(false);
    const res = await POST(makeRequest(validWebhookBody));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.message).toContain("signature");
  });

  it("returns 400 when webhook data is missing fid", async () => {
    const res = await POST(makeRequest({ data: { cast: { hash: "0x123" } } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when webhook data is missing cast hash", async () => {
    const res = await POST(makeRequest({ data: { fid: 123 } }));
    expect(res.status).toBe(400);
  });

  it("returns 200 (ignored) when no campaign found for cast", async () => {
    mockDb.findCampaignByCastHash.mockResolvedValue(null);
    const res = await POST(makeRequest(validWebhookBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("not found");
  });

  it("returns 200 (ignored) when user data cannot be fetched", async () => {
    mockDb.findCampaignByCastHash.mockResolvedValue(mockCampaign as any);
    mockNeynar.getUserDataFromFid.mockResolvedValue(null);

    const res = await POST(makeRequest(validWebhookBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("user data");
  });

  it("returns 200 (ignored) when user already minted", async () => {
    mockDb.findCampaignByCastHash.mockResolvedValue(mockCampaign as any);
    mockNeynar.getUserDataFromFid.mockResolvedValue({ address: "0xuser", username: "testuser" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDb.reserveMint.mockRejectedValue({ code: "P2002" });

    const res = await POST(makeRequest(validWebhookBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("already minted");
  });

  it("returns 200 (ignored) when campaign is at mint limit", async () => {
    mockDb.findCampaignByCastHash.mockResolvedValue(mockCampaign as any);
    mockNeynar.getUserDataFromFid.mockResolvedValue({ address: "0xuser", username: "testuser" });
    mockDb.getMintCount.mockResolvedValue(100); // equals max_mints

    const res = await POST(makeRequest(validWebhookBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("ended");
  });

  it("mints NFT and records it on successful flow", async () => {
    mockDb.findCampaignByCastHash.mockResolvedValue(mockCampaign as any);
    mockNeynar.getUserDataFromFid.mockResolvedValue({ address: "0xuser", username: "testuser" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDb.reserveMint.mockResolvedValue({ id: 99 } as any);
    mockBlockchain.mintNFT.mockResolvedValue({ success: true, tokenId: 42, hash: "0xtxhash" as `0x${string}` });
    mockDb.finalizeMint.mockResolvedValue(undefined as any);
    mockNeynar.publishCast.mockResolvedValue({ success: true, hash: "0xcast" });

    const res = await POST(makeRequest(validWebhookBody));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toContain("testuser");

    expect(mockBlockchain.mintNFT).toHaveBeenCalledWith("0xuser");
    expect(mockDb.reserveMint).toHaveBeenCalledWith(1, "0xuser", 12345);
    expect(mockDb.finalizeMint).toHaveBeenCalledWith(99, 42);
    expect(mockNeynar.publishCast).toHaveBeenCalled();
  });

  it("returns 500 when mint fails", async () => {
    mockDb.findCampaignByCastHash.mockResolvedValue(mockCampaign as any);
    mockNeynar.getUserDataFromFid.mockResolvedValue({ address: "0xuser", username: "testuser" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDb.reserveMint.mockResolvedValue({ id: 99 } as any);
    mockDb.failMint.mockResolvedValue(undefined as any);
    mockBlockchain.mintNFT.mockResolvedValue({ success: false, tokenId: -1, hash: "0x" as `0x${string}` });

    const res = await POST(makeRequest(validWebhookBody));
    expect(res.status).toBe(500);
  });
});
