/**
 * Decoupled DEMO DATA layer.
 *
 * Lets the frontend be built and evaluated without a database or chain.
 * When a real DATABASE_URL is configured, the app uses the real DB; otherwise
 * (or when DEMO_MODE=true) read endpoints serve rich canned data and writes
 * are stubbed. The frontend keeps calling the same API routes unchanged.
 *
 * Swappability: routes short-circuit through `isDemoMode()` at the very top,
 * before any Prisma/Neynar/chain call. Flip the env and the real path takes over.
 */

/** Demo mode is on when explicitly forced, or when no database is configured. */
export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL;
}

// Avatars/images render through next/image with `unoptimized`, so no
// remote-pattern config is needed for these SVG URLs.
const avatar = (seed: string) => `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}`;
const campaignImage = (seed: string) => `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(seed)}`;

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();

interface DemoCampaign {
  id: number;
  name: string;
  image_url: string;
  target_cast_hash: string;
  max_mints: number;
  created_at: string;
  nft_image_url_level_1: string;
  nft_image_url_level_2: string | null;
  nft_image_url_level_3: string | null;
  is_active: boolean;
  creator_fid: number | null;
  minted: number; // demo-only convenience field for accessors
}

const CAMPAIGNS: DemoCampaign[] = [
  {
    id: 1,
    name: "Base Builders Drop",
    image_url: campaignImage("Base Builders Drop"),
    target_cast_hash: "0xdemo0001",
    max_mints: 500,
    created_at: daysAgo(2),
    nft_image_url_level_1: campaignImage("base-builders-l1"),
    nft_image_url_level_2: campaignImage("base-builders-l2"),
    nft_image_url_level_3: campaignImage("base-builders-l3"),
    is_active: true,
    creator_fid: 8447,
    minted: 142,
  },
  {
    id: 2,
    name: "Onchain Summer Vol.3",
    image_url: campaignImage("Onchain Summer Vol.3"),
    target_cast_hash: "0xdemo0002",
    max_mints: 1000,
    created_at: daysAgo(5),
    nft_image_url_level_1: campaignImage("onchain-summer-l1"),
    nft_image_url_level_2: campaignImage("onchain-summer-l2"),
    nft_image_url_level_3: campaignImage("onchain-summer-l3"),
    is_active: true,
    creator_fid: 3,
    minted: 88,
  },
  {
    id: 3,
    name: "Degen Mini App Launch",
    image_url: campaignImage("Degen Mini App Launch"),
    target_cast_hash: "0xdemo0003",
    max_mints: 200,
    created_at: daysAgo(1),
    nft_image_url_level_1: campaignImage("degen-launch-l1"),
    nft_image_url_level_2: campaignImage("degen-launch-l2"),
    nft_image_url_level_3: null,
    is_active: true,
    creator_fid: 99,
    minted: 67,
  },
  {
    id: 4,
    name: "Base Around The World",
    image_url: campaignImage("Base Around The World"),
    target_cast_hash: "0xdemo0004",
    max_mints: 500,
    created_at: daysAgo(9),
    nft_image_url_level_1: campaignImage("base-world-l1"),
    nft_image_url_level_2: campaignImage("base-world-l2"),
    nft_image_url_level_3: campaignImage("base-world-l3"),
    is_active: true,
    creator_fid: 1317,
    minted: 410,
  },
  {
    id: 5,
    name: "Farcaster OG Drop",
    image_url: campaignImage("Farcaster OG Drop"),
    target_cast_hash: "0xdemo0005",
    max_mints: 100,
    created_at: daysAgo(12),
    nft_image_url_level_1: campaignImage("farcaster-og-l1"),
    nft_image_url_level_2: campaignImage("farcaster-og-l2"),
    nft_image_url_level_3: null,
    is_active: true,
    creator_fid: 5650,
    minted: 25,
  },
  {
    id: 6,
    name: "Genesis Mint (Closed)",
    image_url: campaignImage("Genesis Mint"),
    target_cast_hash: "0xdemo0006",
    max_mints: 250,
    created_at: daysAgo(40),
    nft_image_url_level_1: campaignImage("genesis-l1"),
    nft_image_url_level_2: campaignImage("genesis-l2"),
    nft_image_url_level_3: campaignImage("genesis-l3"),
    is_active: false,
    creator_fid: 2,
    minted: 250,
  },
];

interface DemoCompetitor {
  id: number;
  username: string;
  fid: number;
  score: number;
  campaignId: number;
  campaignName: string;
  level: number;
}

const COMPETITORS: DemoCompetitor[] = [
  { id: 101, username: "degen.eth", fid: 8447, score: 48, campaignId: 1, campaignName: "Base Builders Drop", level: 4 },
  { id: 102, username: "jessepollak", fid: 99, score: 41, campaignId: 1, campaignName: "Base Builders Drop", level: 3 },
  {
    id: 103,
    username: "vitalik.eth",
    fid: 5650,
    score: 37,
    campaignId: 2,
    campaignName: "Onchain Summer Vol.3",
    level: 3,
  },
  { id: 104, username: "dwr.eth", fid: 3, score: 33, campaignId: 2, campaignName: "Onchain Summer Vol.3", level: 3 },
  { id: 105, username: "linda", fid: 1317, score: 31, campaignId: 4, campaignName: "Base Around The World", level: 2 },
  {
    id: 106,
    username: "based.eth",
    fid: 7766,
    score: 28,
    campaignId: 3,
    campaignName: "Degen Mini App Launch",
    level: 2,
  },
  {
    id: 107,
    username: "nounish",
    fid: 4823,
    score: 22,
    campaignId: 4,
    campaignName: "Base Around The World",
    level: 2,
  },
  {
    id: 108,
    username: "onchainmaxi",
    fid: 9021,
    score: 15,
    campaignId: 5,
    campaignName: "Farcaster OG Drop",
    level: 1,
  },
];

const LEVEL_IMAGES: Record<number, string> = {
  1: "https://ipfs.io/ipfs/bafybeiakfsnmcuqenkwsbhtpi4mh5dq62aho3g2svww5hfw5b4lodgfh3m",
  2: "https://ipfs.io/ipfs/bafybeic3rbxwu4tnhiozdpaorom4fk5aj2ue3utwgbxcfnyqtweoy2e4d4",
  3: "https://ipfs.io/ipfs/bafybeicqqoskrn2t46kztiz3utes3rrbrlbgkflmafzy5nfjxcs3a2fnbm",
  4: "https://ipfs.io/ipfs/bafybeihj4kvd47itz6dzt5zh4o4ze72f3ybn3fhaadlwwjxh4r4utactmy",
};

/** Shape a campaign for the `/api/campaigns`-style payload (with `_count`). */
function toCampaignPayload(c: DemoCampaign) {
  return {
    id: c.id,
    name: c.name,
    image_url: c.image_url,
    target_cast_hash: c.target_cast_hash,
    max_mints: c.max_mints,
    created_at: c.created_at,
    nft_image_url_level_1: c.nft_image_url_level_1,
    nft_image_url_level_2: c.nft_image_url_level_2,
    nft_image_url_level_3: c.nft_image_url_level_3,
    is_active: c.is_active,
    creator_fid: c.creator_fid,
    _count: { nfts_minted: c.minted },
  };
}

/** `/api/dashboard/main` — trending campaigns + featured duels. */
export function getDemoDashboard() {
  const trendingCampaigns = CAMPAIGNS.filter(c => c.is_active)
    .slice(0, 5)
    .map(c => ({
      id: c.id,
      name: c.name,
      image_url: c.image_url,
      max_mints: c.max_mints,
      _count: { nfts_minted: c.minted },
      is_active: c.is_active,
      created_at: c.created_at,
    }));

  const featuredDuels = COMPETITORS.slice(0, 4).map(d => ({
    id: d.id,
    name: `@${d.username}`,
    score: d.score,
    campaignName: d.campaignName,
  }));

  return { trendingCampaigns, featuredDuels };
}

/** `/api/duels` — leaderboard of active competitors, descending by score. */
export function getDemoDuels() {
  const duels = COMPETITORS.map(d => ({
    id: d.id,
    name: `@${d.username}`,
    pfpUrl: avatar(d.username),
    score: d.score,
    campaignId: d.campaignId,
    campaignName: d.campaignName,
  }));
  return { duels };
}

/** `/api/metrics` — aggregate platform stats. */
export function getDemoMetrics() {
  return {
    totalCampaigns: 12,
    activeCampaigns: 5,
    totalMints: 732,
    uniqueParticipants: 540,
    registeredCompetitors: 188,
  };
}

/** `/api/campaigns` — full campaign list with mint counts. */
export function getDemoCampaigns() {
  return CAMPAIGNS.map(toCampaignPayload);
}

/** `/api/campaign-status?id=` — name + progress for one campaign. */
export function getDemoCampaignStatus(id: number) {
  const c = CAMPAIGNS.find(x => x.id === id) ?? CAMPAIGNS[0];
  return { name: c.name, progress: c.minted, total: c.max_mints };
}

/** `/api/my-claims?fid=` — campaigns the user is eligible to claim. */
export function getDemoMyClaims() {
  const eligibleCampaigns = CAMPAIGNS.filter(c => c.is_active)
    .slice(0, 3)
    .map(c => ({ id: c.id, name: c.name }));
  return { eligibleCampaigns };
}

/** Level number → human-readable level name. */
const LEVEL_NAMES: Record<number, string> = {
  1: "Participant",
  2: "Influencer",
  3: "Champion",
  4: "Legend",
};

/** Public helper so the UI can map a level number to its name consistently. */
export function levelName(level: number): string {
  return LEVEL_NAMES[level] ?? "Participant";
}

/** `/api/my-trophies?fid=` — the user's profile: aggregate stats + earned trophies. */
export function getDemoProfile() {
  const trophies = [
    {
      id: 1,
      campaignName: "Base Builders Drop",
      level: 3,
      levelName: levelName(3),
      imageUrl: campaignImage("Base Builders Drop"),
    },
    {
      id: 2,
      campaignName: "Onchain Summer",
      level: 2,
      levelName: levelName(2),
      imageUrl: campaignImage("Onchain Summer"),
    },
    {
      id: 3,
      campaignName: "Farcaster OG Drop",
      level: 1,
      levelName: levelName(1),
      imageUrl: campaignImage("Farcaster OG Drop"),
    },
  ];

  return {
    stats: {
      trophies: trophies.length,
      totalLikes: 112,
      bestLevel: Math.max(...trophies.map(t => t.level)),
    },
    trophies,
  };
}

/** `/api/gamification/status` — a plausible holder status payload. */
export function getDemoGamificationStatus() {
  const me = COMPETITORS[0];
  return {
    tokenId: 1,
    name: `SocialDrop NFT - Level ${me.level}`,
    imageUrl: LEVEL_IMAGES[me.level] ?? LEVEL_IMAGES[1],
    score: me.score,
    level: me.level,
  };
}
