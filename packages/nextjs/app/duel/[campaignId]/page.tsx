"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useFarcaster } from "@/hooks/useFarcaster";
import { cn } from "@/lib/utils";

interface NftStatus {
  tokenId: number;
  name: string;
  imageUrl: string;
  score: number;
  level: number;
}

interface DuelEntry {
  id: number;
  name: string;
  pfpUrl: string;
  score: number;
  campaignId: number;
  campaignName: string;
}

// Base motion: short, easing (0.4, 0, 0.2, 1), no 3D, no blur.
const EASE = [0.4, 0, 0.2, 1] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } },
};

const PODIUM_MEDAL = [
  "bg-accent text-accent-foreground",
  "bg-[#b1b7c3] text-background",
  "bg-[#b8a581] text-background",
];

export default function DuelPage() {
  const params = useParams();
  const campaignId = Number(params.campaignId);
  const { user, isLoading: isUserLoading } = useFarcaster();

  const [playerStatus, setPlayerStatus] = useState<NftStatus | null>(null);
  const [leaderboard, setLeaderboard] = useState<DuelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notRegistered, setNotRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [castHash, setCastHash] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getUserFid = useCallback(() => {
    return user?.fid ?? null;
  }, [user]);

  const fetchData = useCallback(async () => {
    const fid = getUserFid();
    if (!fid || !campaignId) {
      setIsLoading(false);
      setError("Missing user or campaign data.");
      return;
    }

    setError(null);

    try {
      const [statusRes, duelsRes] = await Promise.all([
        fetch(`/api/gamification/status?fid=${fid}&campaignId=${campaignId}`),
        fetch("/api/duels"),
      ]);

      const statusData = await statusRes.json();
      const duelsData = await duelsRes.json();

      if (statusData.error) {
        if (statusRes.status === 404) {
          setNotRegistered(true);
          setPlayerStatus(null);
        } else {
          setError(statusData.error);
        }
      } else {
        setPlayerStatus(statusData);
        setNotRegistered(false);
      }

      if (duelsData.duels) {
        setLeaderboard(duelsData.duels.filter((d: DuelEntry) => d.campaignId === campaignId));
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  }, [getUserFid, campaignId]);

  useEffect(() => {
    if (isUserLoading) return;
    fetchData();
  }, [fetchData, isUserLoading]);

  const handleRegister = async () => {
    const fid = getUserFid();
    if (!fid || !castHash.trim()) return;

    setIsRegistering(true);
    try {
      const res = await sdk.quickAuth.fetch("/api/gamification/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, castHash: castHash.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Registered! Your cast is now being tracked.");
        setCastHash("");
        await fetchData();
      } else {
        toast.error(data.error || "Registration failed.");
      }
    } catch {
      toast.error("Could not connect to the server.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRefreshScore = async () => {
    const fid = getUserFid();
    if (!fid) return;

    setIsRefreshing(true);
    const toastId = toast.loading("Updating score...");
    try {
      const res = await sdk.quickAuth.fetch("/api/gamification/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      toast.dismiss(toastId);

      if (data.evolved) {
        toast.success(`Your NFT evolved to Level ${data.level}!`);
      } else {
        toast.success(`Score updated: ${data.score} likes`);
      }

      await fetchData();
    } catch {
      toast.dismiss(toastId);
      toast.error("Could not update score.");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24 text-foreground">
        <div className="mx-auto max-w-md px-5 pt-6">
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-6 h-40 w-full animate-pulse rounded-[14px] bg-muted" />
          <div className="mt-6 h-48 w-full animate-pulse rounded-[14px] bg-muted" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background pb-24 text-foreground">
        <div className="mx-auto max-w-md px-5 pt-6">
          <h1 className="font-doto text-xl text-foreground">Arena</h1>
          <div className="mt-6 rounded-[14px] border border-destructive/40 bg-card px-6 py-10 text-center ring-1 ring-white/5">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]]; // 2nd, 1st, 3rd

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-md px-5 pt-6">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: EASE }}
        >
          <h1 className="font-doto text-xl text-foreground">Arena</h1>
          <p className="mt-1 text-[11px] text-muted-foreground">War of Influence · {leaderboard.length} competing</p>
        </motion.header>

        <motion.div variants={container} initial="hidden" animate="show" className="mt-6 space-y-6">
          {/* Registration */}
          {notRegistered ? (
            <motion.div
              variants={item}
              className="rounded-[14px] border border-border/60 bg-card p-5 ring-1 ring-white/5"
            >
              <span className="font-doto text-[11px] text-foreground/90">Promote your cast</span>
              <p className="mt-2 text-xs text-muted-foreground">
                Post a cast promoting this campaign, then paste the cast hash below to start competing. Your NFT evolves
                as you earn likes.
              </p>
              <input
                type="text"
                placeholder="Paste your cast hash (0x...)"
                className="mt-4 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                value={castHash}
                onChange={e => setCastHash(e.target.value)}
              />
              <Button className="mt-3 w-full" onClick={handleRegister} disabled={isRegistering || !castHash.trim()}>
                {isRegistering ? "Registering…" : "Promote your cast →"}
              </Button>
            </motion.div>
          ) : playerStatus ? (
            /* Player status — gold motif when registered */
            <motion.div
              variants={item}
              className="rounded-[14px] border border-accent/40 bg-card p-5 text-center ring-1 ring-accent/10"
            >
              <Image
                src={playerStatus.imageUrl}
                alt={playerStatus.name}
                width={160}
                height={160}
                className="mx-auto size-40 rounded-xl border-2 border-accent object-cover shadow-[0_0_24px_rgba(255,209,47,0.25)]"
                unoptimized
              />
              <p className="mt-3 text-base font-bold text-foreground">@{user?.username || "you"}</p>
              <div className="mt-4 flex gap-2">
                <div className="flex-1 rounded-[10px] border border-border/60 bg-background py-2.5">
                  <div className="text-xl font-extrabold tabular-nums text-accent">{playerStatus.score}</div>
                  <div className="font-doto mt-0.5 text-[9px] text-muted-foreground">Score</div>
                </div>
                <div className="flex-1 rounded-[10px] border border-border/60 bg-background py-2.5">
                  <div className="text-xl font-extrabold tabular-nums text-foreground">L{playerStatus.level}</div>
                  <div className="font-doto mt-0.5 text-[9px] text-muted-foreground">Level</div>
                </div>
              </div>
              <Button variant="outline" className="mt-3 w-full" onClick={handleRefreshScore} disabled={isRefreshing}>
                <ArrowPathIcon className={cn("size-4", isRefreshing && "animate-spin")} />
                {isRefreshing ? "Refreshing…" : "Refresh Score"}
              </Button>
            </motion.div>
          ) : null}

          {/* Leaderboard */}
          <motion.div variants={item}>
            <span className="font-doto text-sm text-foreground/90">Leaderboard</span>

            {leaderboard.length === 0 ? (
              <div className="mt-3 rounded-[14px] border border-border/60 bg-card px-6 py-10 text-center ring-1 ring-white/5">
                <p className="text-sm text-muted-foreground">No competitors yet. Be the first!</p>
              </div>
            ) : (
              <>
                {/* Podium */}
                <div className="mt-4 flex items-end justify-center gap-3">
                  {podiumOrder.map((entry, i) => {
                    if (!entry) return <div key={`empty-${i}`} className="w-16" />;
                    const isWinner = i === 1;
                    const rank = isWinner ? 1 : i === 0 ? 2 : 3;
                    return (
                      <div key={entry.id} className="flex w-20 flex-col items-center text-center">
                        <span
                          className={cn(
                            "overflow-hidden rounded-full bg-card",
                            isWinner
                              ? "size-12 border-2 border-accent shadow-[0_0_16px_rgba(255,209,47,0.4)]"
                              : "size-9 border-2 border-border",
                          )}
                        >
                          {entry.pfpUrl ? (
                            <Image
                              src={entry.pfpUrl}
                              alt={entry.name}
                              width={isWinner ? 48 : 36}
                              height={isWinner ? 48 : 36}
                              className="size-full object-cover"
                              unoptimized
                            />
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "mt-1.5 flex items-center justify-center rounded-[4px] font-bold",
                            isWinner ? "size-[22px] text-[12px]" : "size-[18px] text-[10px]",
                            PODIUM_MEDAL[rank - 1],
                          )}
                        >
                          {rank}
                        </span>
                        <span
                          className={cn(
                            "mt-1 max-w-full truncate text-[10px]",
                            isWinner ? "font-bold text-foreground" : "text-foreground/90",
                          )}
                        >
                          {entry.name}
                        </span>
                        <span
                          className={cn("text-[10px] tabular-nums", isWinner ? "text-accent" : "text-muted-foreground")}
                        >
                          {entry.score} ♥
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Rank 4+ */}
                {rest.length > 0 && (
                  <div className="mt-4 space-y-1">
                    {rest.map((entry, i) => {
                      const rank = i + 4;
                      const isYou =
                        playerStatus != null &&
                        entry.score === playerStatus.score &&
                        entry.name.includes(user?.username || " ");
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "flex items-center gap-2.5 rounded-[9px] px-2.5 py-2",
                            isYou ? "bg-primary/10 ring-1 ring-primary" : "bg-card ring-1 ring-white/5",
                          )}
                        >
                          <span className="flex size-[18px] flex-none items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {rank}
                          </span>
                          <span className="size-[26px] flex-none overflow-hidden rounded-full border border-border/60 bg-card">
                            {entry.pfpUrl ? (
                              <Image
                                src={entry.pfpUrl}
                                alt={entry.name}
                                width={26}
                                height={26}
                                className="size-[26px] object-cover"
                                unoptimized
                              />
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              "min-w-0 truncate text-[13px]",
                              isYou ? "font-bold text-foreground" : "text-foreground/90",
                            )}
                          >
                            {entry.name}
                          </span>
                          <b className="ml-auto flex-none text-[13px] tabular-nums text-foreground">{entry.score} ♥</b>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
