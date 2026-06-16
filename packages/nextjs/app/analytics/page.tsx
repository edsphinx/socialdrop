"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { cn } from "@/lib/utils";

interface Metrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalMints: number;
  uniqueParticipants: number;
  registeredCompetitors: number;
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

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetch("/api/metrics")
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => {
        console.error("Error loading metrics:", err);
        setIsError(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const stats: { label: string; value: number; hero?: boolean }[] = metrics
    ? [
        { label: "Total Campaigns", value: metrics.totalCampaigns },
        { label: "Active Campaigns", value: metrics.activeCampaigns },
        { label: "NFTs Minted", value: metrics.totalMints, hero: true },
        { label: "Unique Participants", value: metrics.uniqueParticipants },
        { label: "Registered Competitors", value: metrics.registeredCompetitors },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-2xl px-5 pt-6">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="mb-6"
        >
          <h1 className="font-doto text-2xl text-foreground">Platform Metrics</h1>
          <p className="mt-2 text-[13px] text-muted-foreground">Real-time data from SocialDrop on Base</p>
        </motion.header>

        {isLoading ? (
          <MetricsSkeleton />
        ) : isError || !metrics ? (
          <MetricsErrorState />
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          >
            {stats.map(stat => (
              <motion.div key={stat.label} variants={item}>
                <StatCard label={stat.label} value={stat.value} hero={stat.hero} />
              </motion.div>
            ))}
          </motion.div>
        )}

        <p className="mt-8 text-[11px] leading-relaxed text-muted-foreground">
          SocialDrop is free, open-source infrastructure for engagement-driven airdrops on Base.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}

function StatCard({ label, value, hero }: { label: string; value: number; hero?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-card p-5", hero ? "border-accent/40" : "border-border")}>
      <div
        className={cn(
          "text-[34px] font-extrabold leading-none tabular-nums tracking-tight",
          hero ? "text-accent" : "text-foreground",
        )}
      >
        {value.toLocaleString()}
      </div>
      <div className="mt-2.5 text-[11px] font-medium tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function MetricsErrorState() {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
      <p className="text-sm font-semibold text-foreground">Could not load metrics</p>
      <p className="mt-1.5 text-[12px] text-muted-foreground">Please try again in a moment.</p>
    </div>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-xl border border-border bg-card p-5">
          <div className="h-8 w-1/2 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
