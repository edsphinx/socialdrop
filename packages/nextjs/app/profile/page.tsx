"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Farcaster from "@farcaster/miniapp-sdk";
import { motion } from "framer-motion";
import { TrophyIcon } from "@heroicons/react/24/outline";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FarcasterUser = Awaited<typeof Farcaster.context>["user"];

type Trophy = {
  id: number;
  campaignName: string;
  level: number;
  levelName: string;
  imageUrl: string;
};

type ProfileData = {
  stats: { trophies: number; totalLikes: number; bestLevel: number };
  trophies: Trophy[];
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

// Level number → name. Mirrors the demo layer mapping.
const LEVEL_NAMES: Record<number, string> = {
  1: "Participant",
  2: "Influencer",
  3: "Champion",
  4: "Legend",
};

function levelName(level: number): string {
  return LEVEL_NAMES[level] ?? "Participant";
}

function getPfpUrl(user: FarcasterUser | null): string | undefined {
  if (!user) return undefined;
  // Farcaster context may expose pfpUrl or pfp_url depending on host version.
  const u = user as unknown as { pfpUrl?: string; pfp_url?: string };
  return u.pfpUrl ?? u.pfp_url;
}

export default function ProfilePage() {
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    fc.actions.ready();
    fc.context
      .then(context => {
        if (context?.user) setUser(context.user);
      })
      .catch(err => console.error("Error getting user context:", err));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fid = user?.fid;
    const url = fid ? `/api/my-trophies?fid=${fid}` : "/api/my-trophies";
    fetch(url)
      .then(res => res.json())
      .then((data: ProfileData) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) setProfile({ stats: { trophies: 0, totalLikes: 0, bestLevel: 0 }, trophies: [] });
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.fid]);

  const pfpUrl = getPfpUrl(user);
  const username = user?.username ? `@${user.username}` : "@you";
  const stats = profile?.stats;
  const bestLevel = stats?.bestLevel ?? 0;
  const statusName = bestLevel > 0 ? levelName(bestLevel) : "Newcomer";

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-md px-5 pt-6">
        {/* Profile header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="mb-5 flex items-center gap-3.5"
        >
          {/* pfp with gold ring */}
          <div className="size-[54px] flex-none overflow-hidden rounded-full bg-card ring-2 ring-accent">
            {pfpUrl ? (
              <Image
                src={pfpUrl}
                alt={username}
                width={54}
                height={54}
                className="size-[54px] object-cover"
                unoptimized
              />
            ) : (
              <div className="flex size-[54px] items-center justify-center text-lg font-bold text-foreground/70">
                {user?.username?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>

          <div className="min-w-0">
            <div className="truncate text-[18px] font-bold leading-none tracking-tight text-foreground">{username}</div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-accent">
              {bestLevel > 0 && (
                <span className="flex size-4 flex-none items-center justify-center rounded-[3px] bg-accent text-[9px] font-black text-accent-foreground">
                  {bestLevel}
                </span>
              )}
              {statusName}
            </div>
          </div>
        </motion.header>

        <motion.div variants={container} initial="hidden" animate="show">
          {/* Stats row */}
          <motion.div variants={item} className="mb-5 grid grid-cols-3 gap-2">
            <StatTile value={dataLoading ? "—" : String(stats?.trophies ?? 0)} label="TROPHIES" />
            <StatTile value={dataLoading ? "—" : String(stats?.totalLikes ?? 0)} label="TOTAL ♥" gold />
            <StatTile value={dataLoading ? "—" : bestLevel > 0 ? `L${bestLevel}` : "—"} label="BEST" />
          </motion.div>

          {/* Your Trophies */}
          <motion.div variants={item} className="mb-3">
            <span className="font-doto text-[11px] text-muted-foreground">Your Trophies</span>
          </motion.div>

          {dataLoading ? (
            <TrophiesSkeleton />
          ) : profile && profile.trophies.length > 0 ? (
            <div className="grid grid-cols-2 gap-2.5">
              {profile.trophies.map(t => (
                <motion.div key={t.id} variants={item}>
                  <TrophyCard trophy={t} />
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div variants={item}>
              <TrophiesEmptyState />
            </motion.div>
          )}

          {/* Creator Studio entry */}
          <motion.div variants={item} className="mt-4">
            <Button asChild variant="outline" className="h-11 w-full justify-center text-[13px] font-bold">
              <Link href="/admin">＋ Creator Studio</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}

function StatTile({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
  return (
    <div className="rounded-[10px] border border-border bg-card px-2 py-2.5 text-center">
      <div
        className={cn("text-[20px] font-extrabold leading-none tabular-nums", gold ? "text-accent" : "text-foreground")}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[9px] font-medium tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function TrophyCard({ trophy }: { trophy: Trophy }) {
  return (
    <div className="rounded-[10px] border border-border bg-card p-3 text-center">
      {/* Gold square-medal: bordered tile holding the trophy image + a gold corner level-square */}
      <div className="relative mx-auto size-[44px] overflow-hidden rounded-lg border-2 border-accent bg-background">
        <Image
          src={trophy.imageUrl}
          alt={`${trophy.campaignName} — ${trophy.levelName}`}
          width={44}
          height={44}
          className="size-full object-cover"
          unoptimized
        />
        <span className="absolute right-0 bottom-0 flex size-[15px] items-center justify-center rounded-tl-[4px] bg-accent text-[9px] font-black leading-none text-accent-foreground">
          {trophy.level}
        </span>
      </div>
      <div className="mt-2.5 truncate text-[11px] font-medium text-foreground">{trophy.campaignName}</div>
      <div className="text-[9px] text-muted-foreground">{trophy.levelName}</div>
    </div>
  );
}

function TrophiesEmptyState() {
  return (
    <div className="rounded-[10px] border border-border bg-card px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <TrophyIcon className="size-9 text-muted-foreground/60" />
        <div>
          <p className="text-sm font-semibold text-foreground">No trophies yet</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Claim your first NFT to earn one</p>
        </div>
        <Button asChild size="sm" className="mt-1">
          <Link href="/claims">Browse drops</Link>
        </Button>
      </div>
    </div>
  );
}

function TrophiesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {[0, 1].map(i => (
        <div key={i} className="rounded-[10px] border border-border bg-card p-3">
          <div className="mx-auto size-[44px] animate-pulse rounded-lg bg-muted" />
          <div className="mx-auto mt-2.5 h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mx-auto mt-1.5 h-2 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
