import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as claimPost } from "@/app/api/claim/route";
import { POST as registerPost } from "@/app/api/gamification/register/route";
import { POST as updatePost } from "@/app/api/gamification/update/route";

const { MockUnauthorizedError, mockGetVerifiedFid } = vi.hoisted(() => {
  class MockUnauthorizedError extends Error {
    constructor(message = "Unauthorized") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }
  return { MockUnauthorizedError, mockGetVerifiedFid: vi.fn() };
});

vi.mock("@/lib/auth/getVerifiedFid", () => ({
  getVerifiedFid: (...args: unknown[]) => mockGetVerifiedFid(...args),
  UnauthorizedError: MockUnauthorizedError,
}));

// Provider should never be reached when auth fails, but mock it to avoid real clients.
vi.mock("@/lib/social", () => ({
  getSocialDataProvider: () => ({
    getUserByFid: vi.fn(),
    didUserLikeCast: vi.fn(),
    getCastLikesCount: vi.fn(),
    publishCast: vi.fn(),
  }),
}));

vi.mock("@/services/database.service", () => ({
  findCampaignById: vi.fn(),
  hasUserMinted: vi.fn(),
  getMintCount: vi.fn(),
  reserveMint: vi.fn(),
  finalizeMint: vi.fn(),
  failMint: vi.fn(),
  findGamificationEntry: vi.fn(),
  updateGamificationScore: vi.fn(),
  findUserMint: vi.fn(),
  updateMintLevel: vi.fn(),
  registerForGamification: vi.fn(),
}));

vi.mock("@/services/blockchain.service", () => ({
  mintNFT: vi.fn(),
  evolveNFT: vi.fn(),
}));

function makeRequest(url: string, body: object): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetVerifiedFid.mockRejectedValue(new MockUnauthorizedError());
});

describe("auth enforcement on mint/evolve endpoints", () => {
  it("claim returns 401 when token verification fails", async () => {
    const res = await claimPost(makeRequest("http://localhost/api/claim", { campaignId: 1 }));
    expect(res.status).toBe(401);
  });

  it("gamification/update returns 401 when token verification fails", async () => {
    const res = await updatePost(makeRequest("http://localhost/api/gamification/update", { campaignId: 1 }) as any);
    expect(res.status).toBe(401);
  });

  it("gamification/register returns 401 when token verification fails", async () => {
    const res = await registerPost(
      makeRequest("http://localhost/api/gamification/register", { campaignId: 1, castHash: "0xcast" }) as any,
    );
    expect(res.status).toBe(401);
  });
});
