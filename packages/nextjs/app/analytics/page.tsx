"use client";

import { useEffect, useState } from "react";

interface Metrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalMints: number;
  uniqueParticipants: number;
  registeredCompetitors: number;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/metrics")
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error("Error loading metrics:", err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!metrics) {
    return <div className="text-center p-8 text-error">Could not load metrics.</div>;
  }

  const stats = [
    { label: "Total Campaigns", value: metrics.totalCampaigns },
    { label: "Active Campaigns", value: metrics.activeCampaigns },
    { label: "NFTs Minted", value: metrics.totalMints },
    { label: "Unique Participants", value: metrics.uniqueParticipants },
    { label: "Registered Competitors", value: metrics.registeredCompetitors },
  ];

  return (
    <div className="flex flex-col items-center min-h-screen p-6 text-white">
      <h1 className="text-3xl font-bold mb-2">Platform Metrics</h1>
      <p className="text-sm opacity-70 mb-8">Real-time data from SocialDrop on Base.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-3xl">
        {stats.map(stat => (
          <div key={stat.label} className="stat bg-base-200 rounded-lg p-6 text-center">
            <div className="stat-title text-sm opacity-70">{stat.label}</div>
            <div className="stat-value text-4xl font-bold mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs opacity-50">
        SocialDrop is free, open-source infrastructure for engagement-driven airdrops on Base.
      </p>
    </div>
  );
}
