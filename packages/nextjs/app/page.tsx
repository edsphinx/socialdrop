"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Farcaster from "@farcaster/miniapp-sdk";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FarcasterUser = Awaited<typeof Farcaster.context>["user"];

type TrendingCampaign = {
  id: number;
  name: string;
  image_url: string | null;
  max_mints: number;
  _count: { nfts_minted: number };
};

type Duel = {
  id?: number;
  name: string;
  pfpUrl: string;
  score: number;
  campaignName: string;
};

const fc = Farcaster;

// Base motion: short, easing (0.4, 0, 0.2, 1), no 3D, no blur.
const EASE = [0.4, 0, 0.2, 1] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } },
};

function getPfpUrl(user: FarcasterUser | null): string | undefined {
  if (!user) return undefined;
  // Farcaster context may expose pfpUrl or pfp_url depending on host version.
  const u = user as unknown as { pfpUrl?: string; pfp_url?: string };
  return u.pfpUrl ?? u.pfp_url;
}

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [campaigns, setCampaigns] = useState<TrendingCampaign[]>([]);
  const [duels, setDuels] = useState<Duel[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    fc.actions.ready();
    fc.context
      .then(context => {
        if (context?.user) setUser(context.user);
      })
      .catch(err => console.error("Error getting user context:", err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/dashboard/main")
        .then(res => res.json())
        .catch(() => ({ trendingCampaigns: [] })),
      fetch("/api/duels")
        .then(res => res.json())
        .catch(() => ({ duels: [] })),
    ])
      .then(([dashboard, duelsRes]) => {
        if (cancelled) return;
        setCampaigns(Array.isArray(dashboard?.trendingCampaigns) ? dashboard.trendingCampaigns : []);
        setDuels(Array.isArray(duelsRes?.duels) ? duelsRes.duels : []);
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pfpUrl = getPfpUrl(user);
  const greeting = user?.username ? `gm, @${user.username}` : "gm";

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-md px-5 pt-6">
        {/* Greeting header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <h1 className="text-[22px] font-bold leading-none tracking-tight">{greeting}</h1>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {isLoading ? "Connecting to Farcaster…" : "Welcome to SocialDrop"}
            </p>
          </div>
          <div className="size-10 flex-none overflow-hidden rounded-full border border-border bg-card">
            {pfpUrl ? (
              <Image
                src={pfpUrl}
                alt={user?.username ? `@${user.username}` : "Profile"}
                width={40}
                height={40}
                className="size-10 object-cover"
                unoptimized
              />
            ) : (
              <div className="flex size-10 items-center justify-center text-sm font-bold text-muted-foreground">
                {user?.username?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
        </motion.header>

        <motion.div variants={container} initial="hidden" animate="show">
          {/* Trending feed */}
          <motion.div variants={item} className="mb-2.5 flex items-center justify-between">
            <span className="font-doto text-[11px] text-foreground">Trending</span>
            <Link href="/claims" className="text-[11px] text-muted-foreground transition-colors hover:text-foreground">
              See all
            </Link>
          </motion.div>

          {dataLoading ? (
            <TrendingSkeleton />
          ) : campaigns.length === 0 ? (
            <motion.div variants={item}>
              <EmptyState text="No campaigns yet" />
            </motion.div>
          ) : (
            <div className="mb-6 space-y-3">
              {campaigns.map(c => (
                <motion.div key={c.id} variants={item}>
                  <CampaignCard campaign={c} />
                </motion.div>
              ))}
            </div>
          )}

          {/* War of Influence preview */}
          <motion.div variants={item} className="mb-2.5 mt-2 flex items-center justify-between">
            <span className="font-doto text-[11px] text-muted-foreground">War of Influence</span>
            <Link href="/duel" className="text-[11px] text-muted-foreground transition-colors hover:text-foreground">
              See all
            </Link>
          </motion.div>

          {dataLoading ? (
            <LeaderboardSkeleton />
          ) : duels.length === 0 ? (
            <motion.div variants={item}>
              <EmptyState text="No duels yet" />
            </motion.div>
          ) : (
            <motion.div variants={item}>
              <Link href="/duel" className="block">
                <Card className="gap-0 px-4 py-2">
                  {duels.slice(0, 4).map((d, i) => (
                    <LeaderboardRow
                      key={d.id ?? `${d.name}-${i}`}
                      rank={i + 1}
                      duel={d}
                      last={i === Math.min(duels.length, 4) - 1}
                    />
                  ))}
                </Card>
              </Link>
            </motion.div>
          )}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: TrendingCampaign }) {
  const minted = campaign._count?.nfts_minted ?? 0;
  const max = campaign.max_mints || 0;
  const pct = max > 0 ? Math.min(100, Math.round((minted / max) * 100)) : 0;

  return (
    <Link href={`/c/${campaign.id}`} className="block">
      <Card className="gap-0 rounded-[14px] p-3.5 transition-colors hover:border-primary/60">
        {/* Image — flat Base Blue block fallback when no image */}
        <div className="relative mb-3 h-[88px] overflow-hidden rounded-lg bg-primary">
          {campaign.image_url ? (
            <Image
              src={campaign.image_url}
              alt={campaign.name}
              fill
              sizes="(max-width: 448px) 100vw, 448px"
              className="object-cover"
              unoptimized
            />
          ) : (
            // Base square motif accent on the flat block
            <span className="absolute -right-3.5 -bottom-3.5 size-[54px] bg-background/20" />
          )}
        </div>

        <div className="text-[14.5px] font-bold leading-tight tracking-tight">{campaign.name}</div>
        <div className="mb-2.5 mt-1.5 text-[11px] tabular-nums text-muted-foreground">
          {minted} / {max} claimed
        </div>

        {/* Thin Base-Blue progress bar */}
        <div className="h-1.5 w-full overflow-hidden bg-border">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </Card>
    </Link>
  );
}

function LeaderboardRow({ rank, duel, last }: { rank: number; duel: Duel; last: boolean }) {
  const isFirst = rank === 1;
  return (
    <div className={cn("flex items-center gap-2.5 py-2.5", !last && "border-b border-border")}>
      <span
        className={cn(
          "flex size-4 flex-none items-center justify-center rounded-[2px] text-[9px] font-bold",
          isFirst ? "bg-accent text-accent-foreground" : "text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <span className="size-[22px] flex-none overflow-hidden rounded-full border border-border bg-card">
        {duel.pfpUrl ? (
          <Image
            src={duel.pfpUrl}
            alt={duel.name}
            width={22}
            height={22}
            className="size-[22px] object-cover"
            unoptimized
          />
        ) : null}
      </span>
      <span className="truncate text-[12.5px]">{duel.name}</span>
      <b className="ml-auto flex-none text-[12.5px] tabular-nums">{duel.score} ♥</b>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="items-center justify-center gap-0 rounded-[14px] py-8 text-center">
      <p className="text-[12px] text-muted-foreground">{text}</p>
    </Card>
  );
}

function TrendingSkeleton() {
  return (
    <div className="mb-6 space-y-3">
      {[0, 1].map(i => (
        <Card key={i} className="gap-0 rounded-[14px] p-3.5">
          <div className="mb-3 h-[88px] animate-pulse rounded-lg bg-card" />
          <div className="mb-2 h-3.5 w-1/2 animate-pulse rounded bg-card" />
          <div className="mb-2.5 h-2.5 w-1/3 animate-pulse rounded bg-card" />
          <div className="h-1.5 w-full bg-border" />
        </Card>
      ))}
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <Card className="gap-0 px-4 py-2">
      {[0, 1, 2].map(i => (
        <div key={i} className={cn("flex items-center gap-2.5 py-2.5", i < 2 && "border-b border-border")}>
          <span className="size-4 flex-none animate-pulse rounded-[2px] bg-card" />
          <span className="size-[22px] flex-none animate-pulse rounded-full bg-card" />
          <span className="h-3 w-24 animate-pulse rounded bg-card" />
          <span className="ml-auto h-3 w-8 animate-pulse rounded bg-card" />
        </div>
      ))}
    </Card>
  );
}
