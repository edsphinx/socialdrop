"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TrophyIcon } from "@heroicons/react/24/outline";

const DuelListItem = ({ duel }: { duel: any }) => (
  <Link
    href={`/duel/${duel.campaignId}`}
    passHref
    className="card bg-base-100 shadow-md hover:border-primary border-transparent border-2 transition-all duration-200"
  >
    <div className="card-body p-4 flex-row items-center gap-4">
      <div className="avatar">
        <div className="w-12 rounded-full">
          <Image src={duel.pfpUrl} alt={duel.name} width={48} height={48} unoptimized />
        </div>
      </div>
      <div className="flex-grow">
        <p className="font-bold">{duel.name}</p>
        <p className="text-xs text-base-content/70">in campaign &quot;{duel.campaignName}&quot;</p>
      </div>
      <div className="flex items-center gap-1 text-secondary font-bold">
        <TrophyIcon className="h-5 w-5" />
        <span>{duel.score}</span>
      </div>
    </div>
  </Link>
);

const DuelListItemSkeleton = () => (
  <div className="card bg-base-100 shadow-md animate-pulse">
    <div className="card-body p-4 flex-row items-center gap-4">
      <div className="avatar">
        <div className="w-12 h-12 rounded-full bg-base-200"></div>
      </div>
      <div className="flex-grow space-y-2">
        <div className="h-4 bg-base-200 rounded w-1/2"></div>
        <div className="h-3 bg-base-200 rounded w-3/4"></div>
      </div>
      <div className="h-6 bg-base-200 rounded w-12"></div>
    </div>
  </div>
);

export default function DuelsPage() {
  const [duels, setDuels] = useState<any[]>([]);
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
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold">Duels Arena</h1>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <>
            <DuelListItemSkeleton />
            <DuelListItemSkeleton />
            <DuelListItemSkeleton />
          </>
        ) : duels.length > 0 ? (
          duels.map(duel => <DuelListItem key={duel.id} duel={duel} />)
        ) : (
          <p>No active duels at the moment. Be the first to compete!</p>
        )}
      </div>
    </div>
  );
}
