import { beforeEach, describe, expect, it, vi } from "vitest";
import { NeynarSocialDataProvider } from "@/lib/social/neynar-provider";

const { fetchBulkUsers, fetchCastReactions } = vi.hoisted(() => ({
  fetchBulkUsers: vi.fn(),
  fetchCastReactions: vi.fn(),
}));
vi.mock("@/lib/clients/neynar", () => ({
  personalNeynarClient: { fetchBulkUsers, fetchCastReactions, publishCast: vi.fn() },
}));

describe("NeynarSocialDataProvider", () => {
  beforeEach(() => vi.clearAllMocks());
  it("getUserByFid returns verified address + profile", async () => {
    fetchBulkUsers.mockResolvedValue({
      users: [
        {
          fid: 7,
          username: "alice",
          pfp_url: "http://x/p.png",
          verified_addresses: { eth_addresses: ["0xabc"] },
          custody_address: "0xdead",
        },
      ],
    });
    expect(await new NeynarSocialDataProvider().getUserByFid(7)).toEqual({
      fid: 7,
      address: "0xabc",
      username: "alice",
      pfpUrl: "http://x/p.png",
    });
  });
  it("getUserByFid falls back to custody address", async () => {
    fetchBulkUsers.mockResolvedValue({
      users: [
        {
          fid: 7,
          username: "alice",
          pfp_url: "p",
          verified_addresses: { eth_addresses: [] },
          custody_address: "0xcust",
        },
      ],
    });
    expect((await new NeynarSocialDataProvider().getUserByFid(7))?.address).toBe("0xcust");
  });
  it("getUserByFid returns null when no user", async () => {
    fetchBulkUsers.mockResolvedValue({ users: [] });
    expect(await new NeynarSocialDataProvider().getUserByFid(7)).toBeNull();
  });
  it("didUserLikeCast true when fid among reactions", async () => {
    fetchCastReactions.mockResolvedValue({ reactions: [{ user: { fid: 7 } }] });
    expect(await new NeynarSocialDataProvider().didUserLikeCast(7, "0xc")).toBe(true);
  });
});
