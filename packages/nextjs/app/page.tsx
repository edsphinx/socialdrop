"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Farcaster from "@farcaster/miniapp-sdk";
import { motion } from "framer-motion";
import { BoltIcon, MegaphoneIcon } from "@heroicons/react/24/outline";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
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
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .catch(() => ({ trendingCampaigns: [] })),
      fetch("/api/duels")
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
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
            <h1 className="text-[22px] font-bold leading-none tracking-tight text-foreground">{greeting}</h1>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {isLoading ? "Connecting to Farcaster…" : "Welcome to SocialDrop"}
            </p>
          </div>
          {/* pfp ring: visible border using ring over the border utility */}
          <div className="size-10 flex-none overflow-hidden rounded-full border-2 border-primary/40 bg-card ring-1 ring-white/10">
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
              <div className="flex size-10 items-center justify-center text-sm font-bold text-foreground/70">
                {user?.username?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
        </motion.header>

        <motion.div variants={container} initial="hidden" animate="show">
          {/* Trending feed */}
          <motion.div variants={item} className="mb-3 flex items-center justify-between">
            <span className="font-doto text-sm text-foreground/90">Trending</span>
            <Link href="/claims" className="text-[11px] text-muted-foreground transition-colors hover:text-foreground">
              See all
            </Link>
          </motion.div>

          {dataLoading ? (
            <TrendingSkeleton />
          ) : campaigns.length === 0 ? (
            <motion.div variants={item} className="mb-6">
              <CampaignsEmptyState />
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
          <motion.div variants={item} className="mb-3 mt-2 flex items-center justify-between">
            <span className="font-doto text-sm text-foreground/90">War of Influence</span>
            <Link href="/duel" className="text-[11px] text-muted-foreground transition-colors hover:text-foreground">
              See all
            </Link>
          </motion.div>

          {dataLoading ? (
            <LeaderboardSkeleton />
          ) : duels.length === 0 ? (
            <motion.div variants={item}>
              <DuelsEmptyState />
            </motion.div>
          ) : (
            <motion.div variants={item}>
              <Link href="/duel" className="block">
                <Card className="gap-0 border border-border/60 px-4 py-2 ring-1 ring-white/5">
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
      <Card className="gap-0 rounded-[14px] border border-border/60 p-4 ring-1 ring-white/5 transition-colors hover:border-primary/60">
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

        <div className="text-[14.5px] font-bold leading-tight tracking-tight text-foreground">{campaign.name}</div>
        <div className="mb-2.5 mt-1.5 text-[11px] tabular-nums text-muted-foreground">
          {minted} / {max} claimed
        </div>

        {/* Thin Base-Blue progress bar on a slightly lighter track */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </Card>
    </Link>
  );
}

function LeaderboardRow({ rank, duel, last }: { rank: number; duel: Duel; last: boolean }) {
  const isFirst = rank === 1;
  return (
    <div className={cn("flex items-center gap-2.5 py-2.5", !last && "border-b border-border/60")}>
      <span
        className={cn(
          "flex size-4 flex-none items-center justify-center rounded-[2px] text-[9px] font-bold",
          isFirst ? "bg-accent text-accent-foreground" : "text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <span className="size-[22px] flex-none overflow-hidden rounded-full border border-border/60 bg-card ring-1 ring-white/5">
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
      <span className="truncate text-[12.5px] text-foreground/90">{duel.name}</span>
      <b className="ml-auto flex-none text-[12.5px] tabular-nums text-foreground">{duel.score} ♥</b>
    </div>
  );
}

function CampaignsEmptyState() {
  return (
    <Card className="gap-0 rounded-[14px] border border-border/60 px-6 py-10 ring-1 ring-white/5">
      <div className="flex flex-col items-center gap-3 text-center">
        <MegaphoneIcon className="size-9 text-muted-foreground/60" />
        <div>
          <p className="text-sm font-semibold text-foreground">No campaigns yet</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Be the first to launch one</p>
        </div>
        <Button asChild size="sm" className="mt-1">
          <Link href="/admin/create">Create a campaign</Link>
        </Button>
      </div>
    </Card>
  );
}

function DuelsEmptyState() {
  return (
    <Card className="gap-0 rounded-[14px] border border-border/60 px-6 py-10 ring-1 ring-white/5">
      <div className="flex flex-col items-center gap-3 text-center">
        <BoltIcon className="size-9 text-muted-foreground/60" />
        <div>
          <p className="text-sm font-semibold text-foreground">No duels yet</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Claim an NFT and compete</p>
        </div>
      </div>
    </Card>
  );
}

function TrendingSkeleton() {
  return (
    <div className="mb-6 space-y-3">
      {[0, 1].map(i => (
        <Card key={i} className="gap-0 rounded-[14px] border border-border/60 p-4 ring-1 ring-white/5">
          <div className="mb-3 h-[88px] animate-pulse rounded-lg bg-muted" />
          <div className="mb-2 h-3.5 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mb-2.5 h-2.5 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-1.5 w-full rounded-full bg-muted" />
        </Card>
      ))}
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <Card className="gap-0 border border-border/60 px-4 py-2 ring-1 ring-white/5">
      {[0, 1, 2].map(i => (
        <div key={i} className={cn("flex items-center gap-2.5 py-2.5", i < 2 && "border-b border-border/60")}>
          <span className="size-4 flex-none animate-pulse rounded-[2px] bg-muted" />
          <span className="size-[22px] flex-none animate-pulse rounded-full bg-muted" />
          <span className="h-3 w-24 animate-pulse rounded bg-muted" />
          <span className="ml-auto h-3 w-8 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </Card>
  );
}
