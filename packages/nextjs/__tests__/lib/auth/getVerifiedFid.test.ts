import { describe, expect, it, vi } from "vitest";
import { UnauthorizedError, getVerifiedFid } from "@/lib/auth/getVerifiedFid";

const { verifyJwt } = vi.hoisted(() => ({ verifyJwt: vi.fn() }));
vi.mock("@farcaster/quick-auth", () => ({
  createClient: () => ({ verifyJwt }),
  Errors: { InvalidTokenError: class InvalidTokenError extends Error {} },
}));

function req(auth?: string) {
  return new Request("https://socialdrop.live/api/claim", { headers: auth ? { authorization: auth } : {} });
}
describe("getVerifiedFid", () => {
  it("returns the fid from a valid token", async () => {
    verifyJwt.mockResolvedValue({ sub: 42 });
    expect(await getVerifiedFid(req("Bearer good.jwt.token"))).toBe(42);
  });
  it("throws Unauthorized when header missing", async () => {
    await expect(getVerifiedFid(req())).rejects.toBeInstanceOf(UnauthorizedError);
  });
  it("throws Unauthorized when verification fails", async () => {
    verifyJwt.mockRejectedValue(new Error("bad"));
    await expect(getVerifiedFid(req("Bearer bad"))).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
