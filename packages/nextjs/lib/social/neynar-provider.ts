import type { CastPublishOptions, SocialDataProvider, SocialUser } from "./types";
import { personalNeynarClient } from "@/lib/clients/neynar";
import {
  getCastLikesCount as neynarGetCastLikesCount,
  publishCast as neynarPublishCast,
} from "@/services/neynar.service";

function toSocialUser(user: any): SocialUser | null {
  const address = user?.verified_addresses?.eth_addresses?.[0] ?? user?.custody_address;
  if (!address) return null;
  return { fid: user.fid, address: address as `0x${string}`, username: user.username, pfpUrl: user.pfp_url ?? "" };
}

export class NeynarSocialDataProvider implements SocialDataProvider {
  async getUserByFid(fid: number): Promise<SocialUser | null> {
    try {
      const res = await personalNeynarClient.fetchBulkUsers({ fids: [fid] });
      const user = res.users[0];
      return user ? toSocialUser(user) : null;
    } catch (e) {
      console.error("[Neynar] getUserByFid:", e);
      return null;
    }
  }
  async didUserLikeCast(fid: number, castHash: string): Promise<boolean> {
    try {
      const res = await personalNeynarClient.fetchCastReactions({ hash: castHash, types: ["likes"], viewerFid: fid });
      return res.reactions.some((r: any) => r.user.fid === fid);
    } catch (e) {
      console.error("[Neynar] didUserLikeCast:", e);
      return false;
    }
  }
  getCastLikesCount(castHash: string): Promise<number> {
    return neynarGetCastLikesCount(castHash);
  }
  async getBulkUsers(fids: number[]): Promise<SocialUser[]> {
    if (fids.length === 0) return [];
    try {
      const res = await personalNeynarClient.fetchBulkUsers({ fids });
      return res.users.map(toSocialUser).filter((u: SocialUser | null): u is SocialUser => u !== null);
    } catch (e) {
      console.error("[Neynar] getBulkUsers:", e);
      return [];
    }
  }
  publishCast(text: string, opts?: CastPublishOptions) {
    return neynarPublishCast(text, opts ?? {});
  }
}
