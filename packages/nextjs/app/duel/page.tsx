"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { BoltIcon } from "@heroicons/react/24/outline";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";

type Duel = {
  id?: number;
  campaignId: number;
  name: string;
  pfpUrl: string;
  score: number;
  campaignName: string;
};

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

function DuelRow({ rank, duel, last }: { rank: number; duel: Duel; last: boolean }) {
  const isFirst = rank === 1;
  return (
    <Link
      href={`/duel/${duel.campaignId}`}
      className={cn(
        "flex items-center gap-2.5 py-2.5 transition-colors hover:bg-foreground/[0.03]",
        !last && "border-b border-border/60",
      )}
    >
      <span
        className={cn(
          "flex size-4 flex-none items-center justify-center rounded-[2px] text-[9px] font-bold",
          isFirst ? "bg-accent text-accent-foreground" : "text-muted-foreground",
        )}
      >
        {rank}
      </span>
      <span className="size-[26px] flex-none overflow-hidden rounded-full border border-border/60 bg-card ring-1 ring-white/5">
        {duel.pfpUrl ? (
          <Image
            src={duel.pfpUrl}
            alt={duel.name}
            width={26}
            height={26}
            className="size-[26px] object-cover"
            unoptimized
          />
        ) : null}
      </span>
      <span className="min-w-0 truncate text-[13px] text-foreground/90">{duel.name}</span>
      <b className="ml-auto flex-none text-[13px] tabular-nums text-foreground">{duel.score} ♥</b>
    </Link>
  );
}

function RowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-2.5 border-b border-border/60 py-2.5">
      <span className="size-4 flex-none rounded-[2px] bg-muted" />
      <span className="size-[26px] flex-none rounded-full bg-muted" />
      <span className="h-3 w-24 rounded bg-muted" />
      <span className="ml-auto h-3 w-10 flex-none rounded bg-muted" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <BoltIcon className="size-9 text-muted-foreground/60" />
      <p className="text-sm font-medium text-foreground/90">No active duels yet</p>
      <p className="text-xs text-muted-foreground">Be the first to compete in the War of Influence.</p>
    </div>
  );
}

export default function DuelsPage() {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/duels")
      .then(res => res.json())
      .then(data => {
        setDuels(data.duels || []);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-md px-5 pt-6">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: EASE }}
        >
          <h1 className="font-doto text-xl text-foreground">Arena</h1>
          <p className="mt-1 text-[11px] text-muted-foreground">War of Influence</p>
        </motion.header>

        <div className="mt-6 rounded-[14px] border border-border/60 bg-card px-4 py-1.5 ring-1 ring-white/5">
          {isLoading ? (
            <div className="py-1">
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </div>
          ) : duels.length > 0 ? (
            <motion.div variants={container} initial="hidden" animate="show">
              {duels.map((duel, i) => (
                <motion.div key={duel.id ?? `${duel.campaignId}-${i}`} variants={item}>
                  <DuelRow rank={i + 1} duel={duel} last={i === duels.length - 1} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <EmptyState />
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
