"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFarcaster } from "@/hooks/useFarcaster";

export default function MyClaimsPage() {
  const { user, isLoading: isUserLoading } = useFarcaster();
  const [eligibleCampaigns, setEligibleCampaigns] = useState<any[]>([]);
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

  if (isUserLoading) {
    return (
      <div className="text-center p-8">
        <span className="loading loading-spinner"></span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {isLoadingCampaigns ? (
        <div className="text-center">
          <span className="loading loading-spinner"></span>
        </div>
      ) : eligibleCampaigns.length > 0 ? (
        <div className="space-y-4">
          {eligibleCampaigns.map(campaign => (
            <div key={campaign.id} className="card bg-base-100 shadow-md">
              <div className="card-body">
                <h3 className="card-title">{campaign.name}</h3>
                <p>You&apos;ve met the requirements! Claim your NFT now.</p>
                <div className="card-actions justify-end">
                  <Link href={`/c/${campaign.id}`} passHref>
                    <button className="btn btn-primary btn-sm">Go to Claim</button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center">
          <p>You have no pending claims.</p>
          <p className="text-sm text-gray-400 mt-2">
            Find new campaigns on Farcaster and like them to become eligible!
          </p>
        </div>
      )}
    </div>
  );
}
