import { personalNeynarClient } from "~~/lib/clients/neynar";

interface CastOptions {
  embeds?: { url: string }[];
  channelId?: string;
  replyTo?: string;
}

export async function getWalletFromFid(fid: number): Promise<string | null> {
  try {
    const userResponse = await personalNeynarClient.fetchBulkUsers({ fids: [fid] });
    const user = userResponse.users[0];

    if (!user) return null;

    // Prioritize verified wallets, then custody address
    let address = user.verified_addresses?.eth_addresses?.[0];
    if (!address) {
      address = user.custody_address;
    }
    return address || null;
  } catch (error) {
    console.error("Error fetching user from Neynar:", error);
    return null;
  }
}

/**
 * Gets key data for a Farcaster user from their FID.
 * @param fid - The Farcaster ID of the user.
 * @returns An object with the wallet address and username, or null if not found.
 */
export async function getUserDataFromFid(fid: number): Promise<{ address: string; username: string } | null> {
  try {
    console.log(`[Neynar Service] Fetching data for FID: ${fid}`);
    const userResponse = await personalNeynarClient.fetchBulkUsers({ fids: [fid] });
    const user = userResponse.users[0];

    if (!user) {
      console.warn(`[Neynar Service] No user found for FID: ${fid}`);
      return null;
    }

    let address = user.verified_addresses?.eth_addresses?.[0];
    if (!address) {
      address = user.custody_address;
    }

    if (!address) {
      console.warn(`[Neynar Service] No wallet found for FID: ${fid}`);
      return null;
    }

    return {
      address,
      username: user.username,
    };
  } catch (error) {
    console.error("[Neynar Service] Error getting user data:", error);
    return null;
  }
}

export async function didUserLikeCast(fid: number, castHash: string): Promise<boolean> {
  try {
    const response = await personalNeynarClient.fetchCastReactions({
      hash: castHash,
      types: ["likes"],
      viewerFid: fid,
    });

    return response.reactions.some(reaction => reaction.user.fid === fid);
  } catch (error) {
    console.error("[Neynar Service] Error verifying cast reaction:", error);
    return false;
  }
}

/**
 * Publishes a cast on Farcaster using Neynar.
 * @param text - The cast content.
 * @param options - Additional options like embeds for Frames.
 * @returns The hash of the published cast.
 */
export async function publishCast(text: string, options: CastOptions = {}) {
  const SIGNER_UUID = process.env.NEYNAR_SIGNER_UUID;
  if (!SIGNER_UUID) {
    throw new Error("NEYNAR_SIGNER_UUID is not configured in .env. Cast publishing has been cancelled.");
  }

  try {
    console.log(`[Farcaster Service] Publishing cast...`);

    const response = await personalNeynarClient.publishCast({
      signerUuid: SIGNER_UUID,
      text,
      ...options,
    });

    const hash = response.cast.hash;

    console.log(`[Farcaster Service] Cast published successfully. Hash: ${hash}`);
    return { success: true, hash: hash };
  } catch (error) {
    console.error("[Farcaster Service] Error publishing cast:", error);
    return { success: false, hash: null };
  }
}

/**
 * Gets the total number of likes for a cast via SDK.
 * @param castHash The hash of the cast to query.
 */
export async function getCastLikesCountSDK(castHash: string) {
  try {
    console.log(`[Neynar Service] Getting like count for ${castHash} (via SDK)`);

    const { cast } = await personalNeynarClient.lookupCastByHashOrUrl({
      identifier: castHash,
      type: "hash",
    });

    return cast;
  } catch (error) {
    console.error(`[Neynar Service] Error with lookupCastByHashOrUrl:`, error);
    return 0;
  }
}

/**
 * Gets the total number of likes for a cast via direct API call.
 * This method is the most robust because it doesn't depend on the SDK.
 * @param castHash The hash of the cast to query.
 * @returns The total number of likes.
 */
export async function getCastLikesCount(castHash: string): Promise<number> {
  const apiKey = process.env.NEYNAR_API_KEY_PERSONAL;
  if (!apiKey) {
    console.error("[Neynar Service] Read API key is not configured.");
    return 0;
  }

  const url = `https://api.neynar.com/v2/farcaster/cast?type=hash&identifier=${castHash}`;

  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      api_key: apiKey,
    },
  };

  try {
    console.log(`[Neynar Service] Getting like count for ${castHash} (via direct fetch)`);

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Neynar API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const likesCount = data.cast?.reactions?.likes_count;

    if (typeof likesCount === "number") {
      return likesCount;
    }

    return 0;
  } catch (error) {
    console.error(`[Neynar Service] Error getting like count for ${castHash}:`, error);
    return 0;
  }
}
