"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { MegaphoneIcon } from "@heroicons/react/24/outline";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Campaign = {
  id: number;
  name: string;
  is_active: boolean;
  max_mints: number;
  _count?: { nfts_minted: number };
};

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

export default function AdminDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampaigns = () => {
    setIsLoading(true);
    fetch("/api/campaigns")
      .then(res => res.json())
      .then(data => {
        setCampaigns(Array.isArray(data) ? data : []);
        setIsLoading(false);
      })
      .catch(() => {
        toast.error("Could not load campaigns.");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-md px-5 pt-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="mb-6 flex items-center justify-between gap-3"
        >
          <div>
            <h1 className="font-doto text-[22px] font-bold leading-none tracking-tight text-foreground">
              Creator Studio
            </h1>
            <p className="mt-1.5 text-[11px] text-muted-foreground">Manage your drops</p>
          </div>
          <Button asChild size="sm" className="flex-none">
            <Link href="/admin/create">＋ New Campaign</Link>
          </Button>
        </motion.header>

        {isLoading ? (
          <CampaignsSkeleton />
        ) : campaigns.length === 0 ? (
          <EmptyState />
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
            {campaigns.map(c => (
              <motion.div key={c.id} variants={item}>
                <CampaignRow campaign={c} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const minted = campaign._count?.nfts_minted ?? 0;
  const max = campaign.max_mints || 0;
  const pct = max > 0 ? Math.min(100, Math.round((minted / max) * 100)) : 0;

  return (
    <Card className="gap-0 rounded-[14px] border border-border/60 p-4 ring-1 ring-white/5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-[14.5px] font-bold leading-tight tracking-tight text-foreground">{campaign.name}</div>
        <span
          className={cn(
            "flex-none rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide",
            campaign.is_active ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground",
          )}
        >
          {campaign.is_active ? "Active" : "Ended"}
        </span>
      </div>

      <div className="mb-2.5 text-[11px] tabular-nums text-muted-foreground">
        {minted} / {max} claimed
      </div>

      {/* Thin Base-Blue progress bar on a slightly lighter track */}
      <div className="mb-3.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>

      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href={`/c/${campaign.id}`}>View Mini-App</Link>
      </Button>
    </Card>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE }}
    >
      <Card className="gap-0 rounded-[14px] border border-border/60 px-6 py-10 ring-1 ring-white/5">
        <div className="flex flex-col items-center gap-3 text-center">
          <MegaphoneIcon className="size-9 text-muted-foreground/60" />
          <div>
            <p className="text-sm font-semibold text-foreground">No campaigns yet</p>
            <p className="mt-1 text-[12px] text-muted-foreground">Launch your first drop to get started</p>
          </div>
          <Button asChild size="sm" className="mt-1">
            <Link href="/admin/create">＋ New Campaign</Link>
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function CampaignsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <Card key={i} className="gap-0 rounded-[14px] border border-border/60 p-4 ring-1 ring-white/5">
          <div className="mb-2 h-3.5 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mb-2.5 h-2.5 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mb-3.5 h-1.5 w-full rounded-full bg-muted" />
          <div className="h-8 w-full animate-pulse rounded-md bg-muted" />
        </Card>
      ))}
    </div>
  );
}
