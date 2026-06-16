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

describe("POST /api/claim — concurrent claim race", () => {
  it("two concurrent claims produce exactly one mint and statuses [200, 409]", async () => {
    mockDb.findCampaignById.mockResolvedValue(mockCampaign as any);
    mockGetUserByFid.mockResolvedValue({ fid: 123, address: "0xuser", username: "testuser", pfpUrl: "" });
    mockDb.getMintCount.mockResolvedValue(5);
    mockDidUserLikeCast.mockResolvedValue(true);

    // The unique constraint acts as the lock: the first reservation wins, the
    // concurrent second one hits a Prisma P2002 unique violation.
    mockDb.reserveMint.mockResolvedValueOnce({ id: 99 } as any).mockRejectedValueOnce({ code: "P2002" });

    mockBlockchain.mintNFT.mockResolvedValue({ success: true, tokenId: 7, hash: "0xtxhash" as `0x${string}` });
    mockDb.finalizeMint.mockResolvedValue(undefined as any);
    mockPublishCast.mockResolvedValue({ success: true, hash: "0xcast" });

    const [resA, resB] = await Promise.all([
      POST(makeRequest({ campaignId: 1 })),
      POST(makeRequest({ campaignId: 1 })),
    ]);

    const statuses = [resA.status, resB.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);

    // Only the winning reservation should ever reach the blockchain.
    expect(mockBlockchain.mintNFT).toHaveBeenCalledTimes(1);
    expect(mockDb.finalizeMint).toHaveBeenCalledTimes(1);
    expect(mockDb.failMint).not.toHaveBeenCalled();
  });
});
