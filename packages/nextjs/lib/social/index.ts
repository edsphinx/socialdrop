import { NeynarSocialDataProvider } from "./neynar-provider";
import type { SocialDataProvider } from "./types";

let _provider: SocialDataProvider | null = null;
export function getSocialDataProvider(): SocialDataProvider {
  if (!_provider) _provider = new NeynarSocialDataProvider();
  return _provider;
}
export type { SocialDataProvider, SocialUser } from "./types";
