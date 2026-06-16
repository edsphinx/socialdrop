export interface SocialUser {
  fid: number;
  address: `0x${string}`;
  username: string;
  pfpUrl: string;
}
export interface CastPublishOptions {
  embeds?: { url: string }[];
  channelId?: string;
  replyTo?: string;
}
export interface SocialDataProvider {
  getUserByFid(fid: number): Promise<SocialUser | null>;
  didUserLikeCast(fid: number, castHash: string): Promise<boolean>;
  getCastLikesCount(castHash: string): Promise<number>;
  getBulkUsers(fids: number[]): Promise<SocialUser[]>;
  publishCast(text: string, opts?: CastPublishOptions): Promise<{ success: boolean; hash: string | null }>;
}
