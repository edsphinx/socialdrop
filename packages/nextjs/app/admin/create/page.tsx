"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import RangeSlider from "react-range-slider-input";
import "react-range-slider-input/dist/style.css";
import { useFarcaster } from "@/hooks/useFarcaster";

type FarcasterUser = {
  fid?: number;
  pfp_url?: string;
  display_name?: string;
  username?: string;
};

const QUANTITY_STOPS = [10, 20, 50, 100, 250, 500, 750, 1000, 2500, 5000];

const CampaignPreviewCard = ({
  user,
  castContent,
  nftCount,
}: {
  user: FarcasterUser | null;
  castContent: string;
  nftCount: number;
}) => (
  <div className="card bg-base-100 shadow-xl sticky top-24">
    <div className="card-body">
      <h2 className="card-title text-lg mb-4">Cast Preview</h2>
      <div className="bg-base-200 p-4 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="avatar">
            <div className="mask mask-squircle w-12 h-12">
              <Image src={user?.pfp_url || "/default-avatar.svg"} alt="Avatar" width={48} height={48} unoptimized />
            </div>
          </div>
          <div>
            <div className="font-bold">{user?.display_name || "Your Name"}</div>
            <div className="text-sm opacity-50">@{user?.username || "your-username"}</div>
          </div>
        </div>
        <p className="mt-4 break-words">{castContent || "Claim this exclusive NFT by liking my cast!"}</p>
        <div className="card bg-base-100 shadow-md mt-4">
          <div className="flex items-center justify-center w-full aspect-[3/2] bg-base-300 text-base-content/60 text-center rounded">
            Your NFT ({nftCount} Editions)
          </div>
        </div>
      </div>
    </div>
  </div>
);

const UserProfileHeader = ({ user }: { user: FarcasterUser | null }) => {
  if (!user) {
    return null;
  }
  return (
    <div className="text-center mb-6 p-3 bg-base-200 rounded-lg border border-base-300">
      <p className="text-sm text-base-content/70">Connected as:</p>
      <div className="flex items-center justify-center gap-2 mt-2">
        <div className="avatar">
          <div className="mask mask-squircle w-6 h-6">
            <Image src={user.pfp_url ?? ""} alt="User Avatar" width={24} height={24} unoptimized />
          </div>
        </div>
        <span className="font-bold text-primary text-lg">@{user.username}</span>
      </div>
    </div>
  );
};

export default function CreateCampaignPage() {
  const { user, isLoading: isUserLoading } = useFarcaster();
  const router = useRouter();

  const [campaignName, setCampaignName] = useState("");
  const [castContent, setCastContent] = useState("");
  const [nftImageUrl, setNftImageUrl] = useState("");
  const [nftCount, setNftCount] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateCampaign = async () => {
    if (!user?.fid) return toast.error("Farcaster user not detected.");
    if (!campaignName.trim()) return toast.error("Please give your campaign a name.");
    if (!castContent.trim()) return toast.error("Cast content cannot be empty.");
    if (!nftImageUrl.trim()) return toast.error("Please provide the NFT image URL.");

    setIsLoading(true);
    const toastId = toast.loading("Creating campaign...");

    try {
      const campaignData = { name: campaignName, castContent, nftCount, creatorFid: user.fid, nftImageUrl };
      const response = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      toast.dismiss(toastId);
      toast.success(`Campaign "${campaignName}" created and published!`);
      router.push("/admin");
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(`Error creating campaign: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const currentIndex = QUANTITY_STOPS.findIndex(stop => stop >= nftCount);
  const handleSliderChange = (value: [number, number]) => {
    const newIndex = value[0];
    setNftCount(QUANTITY_STOPS[newIndex]);
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Math.max(0, Math.min(9999, Number(e.target.value)));
    setNftCount(num);
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <UserProfileHeader user={user} />

            <h1 className="card-title text-3xl font-bold mb-4">Launch New Campaign</h1>

            {/* Name */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">Campaign Name</span>
              </label>
              <input
                type="text"
                placeholder="My Awesome Airdrop"
                className="input input-bordered w-full text-base"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
              />
            </div>

            {/* Cast Content */}
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text text-lg">Announcement Cast Content</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full h-24 text-base"
                placeholder="Claim this exclusive NFT by liking my cast!"
                value={castContent}
                onChange={e => setCastContent(e.target.value)}
              ></textarea>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text text-lg">NFT Image URL (Level 1)</span>
              </label>
              <input
                type="text"
                placeholder="ipfs://..."
                className="input input-bordered w-full text-base"
                value={nftImageUrl}
                onChange={e => setNftImageUrl(e.target.value)}
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Number of NFTs to distribute</span>
              </label>

              <RangeSlider
                min={0}
                max={QUANTITY_STOPS.length - 1}
                step={1}
                value={[currentIndex > -1 ? currentIndex : 0, 0]}
                onInput={handleSliderChange}
                className="range-slider-primary mt-4"
              />

              <div className="w-full flex justify-between text-xs px-1 mt-2">
                {QUANTITY_STOPS.map(stop => (
                  <button
                    key={stop}
                    onClick={() => setNftCount(stop)}
                    className={`btn btn-xs btn-ghost p-1 ${nftCount === stop ? "text-primary" : ""}`}
                  >
                    {stop}
                  </button>
                ))}
              </div>

              <input
                type="number"
                className="input input-bordered w-full mt-4"
                value={nftCount}
                onChange={handleManualInputChange}
              />
            </div>

            {/* Summary and Create Button */}
            <div className="mt-8 p-6 bg-base-200 rounded-lg text-center">
              <p className="text-lg">
                Campaign creation is <span className="text-primary font-bold">free</span>
              </p>
              <p className="text-sm opacity-60 mt-1">SocialDrop is free public infrastructure for the Base ecosystem</p>

              <div className="card-actions justify-center mt-6">
                <button
                  className="btn btn-primary btn-lg w-full md:w-auto"
                  onClick={handleCreateCampaign}
                  disabled={isLoading || !user}
                >
                  {isLoading ? <span className="loading loading-spinner"></span> : "Launch Campaign"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden md:block">
          <CampaignPreviewCard user={user} castContent={castContent} nftCount={nftCount} />
        </div>
      </div>
    </div>
  );
}
