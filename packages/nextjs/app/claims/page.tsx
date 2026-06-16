"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GiftIcon } from "@heroicons/react/24/outline";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useFarcaster } from "@/hooks/useFarcaster";

type EligibleCampaign = {
  id: number | string;
  name: string;
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

export default function MyClaimsPage() {
  const { user, isLoading: isUserLoading } = useFarcaster();
  const [eligibleCampaigns, setEligibleCampaigns] = useState<EligibleCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(true);

  useEffect(() => {
    if (user?.fid) {
      setIsLoadingCampaigns(true);
      fetch(`/api/my-claims?fid=${user.fid}`)
        .then(res => res.json())
        .then(data => {
          setEligibleCampaigns(data.eligibleCampaigns || []);
        })
        .finally(() => setIsLoadingCampaigns(false));
    }
  }, [user]);

  const loading = isUserLoading || isLoadingCampaigns;

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-md px-5 pt-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="mb-6"
        >
          <h1 className="font-doto text-2xl text-foreground">Drops</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">Campaigns you can claim</p>
        </motion.header>

        {loading ? (
          <ClaimsSkeleton />
        ) : eligibleCampaigns.length > 0 ? (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
            {eligibleCampaigns.map(campaign => (
              <motion.div key={campaign.id} variants={item}>
                <Card className="gap-0 p-4">
                  <h3 className="text-[15px] font-bold leading-tight tracking-tight text-foreground">
                    {campaign.name}
                  </h3>
                  <p className="mt-1.5 text-[12px] text-muted-foreground">
                    You&apos;ve met the requirements — claim your NFT now.
                  </p>
                  <div className="mt-4">
                    <Button asChild className="h-10 w-full justify-center text-[13px] font-bold">
                      <Link href={`/c/${campaign.id}`}>Claim</Link>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div variants={item} initial="hidden" animate="show">
            <ClaimsEmptyState />
          </motion.div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function ClaimsEmptyState() {
  return (
    <div className="rounded-[10px] border border-border bg-card px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <GiftIcon className="size-9 text-muted-foreground/60" />
        <div>
          <p className="text-sm font-semibold text-foreground">No drops available</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            Like a campaign cast on Farcaster to become eligible.
          </p>
        </div>
      </div>
    </div>
  );
}

function ClaimsSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map(i => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-10 w-full animate-pulse rounded-md bg-muted" />
        </div>
      ))}
    </div>
  );
}
