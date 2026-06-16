"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import RangeSlider from "react-range-slider-input";
import "react-range-slider-input/dist/style.css";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFarcaster } from "@/hooks/useFarcaster";
import { cn } from "@/lib/utils";

type FarcasterUser = {
  fid?: number;
  pfp_url?: string;
  display_name?: string;
  username?: string;
};

const QUANTITY_STOPS = [10, 20, 50, 100, 250, 500, 750, 1000, 2500, 5000];

// Base motion: short, easing (0.4, 0, 0.2, 1), no 3D, no blur.
const EASE = [0.4, 0, 0.2, 1] as const;

const CampaignPreviewCard = ({
  user,
  castContent,
  nftImageUrl,
  nftCount,
}: {
  user: FarcasterUser | null;
  castContent: string;
  nftImageUrl: string;
  nftCount: number;
}) => (
  <Card className="gap-0 rounded-[14px] border border-border/60 p-4 ring-1 ring-white/5">
    {/* Image — flat Base Blue block fallback when no image */}
    <div className="relative mb-3 h-[120px] overflow-hidden rounded-lg bg-primary">
      {nftImageUrl ? (
        <Image src={nftImageUrl} alt="NFT preview" fill className="object-cover" unoptimized />
      ) : (
        <>
          <span className="absolute -right-3.5 -bottom-3.5 size-[54px] bg-background/20" />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-primary-foreground/80">
            {nftCount} editions
          </span>
        </>
      )}
    </div>

    {/* Creator row */}
    <div className="mb-2.5 flex items-center gap-2.5">
      <span className="size-7 flex-none overflow-hidden rounded-full border border-border/60 bg-card ring-1 ring-white/5">
        {user?.pfp_url ? (
          <Image src={user.pfp_url} alt="Avatar" width={28} height={28} className="size-7 object-cover" unoptimized />
        ) : null}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[12.5px] font-bold leading-tight text-foreground">
          {user?.display_name || "Your Name"}
        </div>
        <div className="truncate text-[10px] text-muted-foreground">@{user?.username || "your-username"}</div>
      </div>
    </div>

    <p className="text-[12.5px] leading-snug text-foreground/90 break-words">
      {castContent || "Claim this exclusive NFT by liking my cast!"}
    </p>

    <div className="mt-3 text-[11px] tabular-nums text-muted-foreground">0 / {nftCount} claimed</div>
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-primary" style={{ width: "0%" }} />
    </div>
  </Card>
);

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
      <div className="min-h-screen bg-background pb-24 text-foreground">
        <div className="mx-auto max-w-md px-5 pt-6">
          <div className="mb-6 h-6 w-1/2 animate-pulse rounded bg-muted" />
          <Card className="gap-0 rounded-[14px] border border-border/60 p-4 ring-1 ring-white/5">
            <div className="space-y-4">
              <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-20 w-full animate-pulse rounded-md bg-muted" />
              <div className="h-9 w-full animate-pulse rounded-md bg-muted" />
            </div>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

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
          <h1 className="font-doto text-[22px] font-bold leading-none tracking-tight text-foreground">New Campaign</h1>
          {user?.username ? (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              as <span className="font-semibold text-primary">@{user.username}</span>
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-muted-foreground">Design your drop</p>
          )}
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE }}
          className="space-y-5"
        >
          {/* Form */}
          <Card className="gap-0 rounded-[14px] border border-border/60 p-4 ring-1 ring-white/5">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="campaign-name" className="text-[12px] text-foreground/90">
                  Campaign Name
                </Label>
                <Input
                  id="campaign-name"
                  type="text"
                  placeholder="My Awesome Airdrop"
                  className="bg-card focus-visible:ring-primary/40 focus-visible:border-primary"
                  value={campaignName}
                  onChange={e => setCampaignName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cast-content" className="text-[12px] text-foreground/90">
                  Announcement Cast Content
                </Label>
                <textarea
                  id="cast-content"
                  className={cn(
                    "min-h-24 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-[color,box-shadow]",
                    "placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/40",
                  )}
                  placeholder="Claim this exclusive NFT by liking my cast!"
                  value={castContent}
                  onChange={e => setCastContent(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nft-image" className="text-[12px] text-foreground/90">
                  NFT Image URL (Level 1)
                </Label>
                <Input
                  id="nft-image"
                  type="text"
                  placeholder="ipfs://..."
                  className="bg-card focus-visible:ring-primary/40 focus-visible:border-primary"
                  value={nftImageUrl}
                  onChange={e => setNftImageUrl(e.target.value)}
                />
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] text-foreground/90">NFTs to distribute</Label>
                  <span className="font-doto text-[15px] tabular-nums text-primary">{nftCount}</span>
                </div>

                <RangeSlider
                  min={0}
                  max={QUANTITY_STOPS.length - 1}
                  step={1}
                  value={[currentIndex > -1 ? currentIndex : 0, 0]}
                  onInput={handleSliderChange}
                  className="!h-1.5"
                  thumbsDisabled={[false, true]}
                  rangeSlideDisabled
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUANTITY_STOPS.map(stop => (
                    <button
                      key={stop}
                      type="button"
                      onClick={() => setNftCount(stop)}
                      className={cn(
                        "rounded-md px-2 py-0.5 text-[10px] font-medium tabular-nums transition-colors",
                        nftCount === stop
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {stop}
                    </button>
                  ))}
                </div>

                <Input
                  type="number"
                  className="mt-1 bg-card tabular-nums focus-visible:ring-primary/40 focus-visible:border-primary"
                  value={nftCount}
                  onChange={handleManualInputChange}
                />
              </div>
            </div>
          </Card>

          {/* Live preview */}
          <div className="space-y-2">
            <span className="font-doto text-sm text-foreground/90">Live Preview</span>
            <CampaignPreviewCard user={user} castContent={castContent} nftImageUrl={nftImageUrl} nftCount={nftCount} />
          </div>

          {/* Free note */}
          <p className="text-center text-[11px] text-muted-foreground">
            Campaign creation is <span className="font-semibold text-primary">free</span> — public infrastructure for
            the Base ecosystem.
          </p>

          {/* Submit */}
          <Button size="lg" className="w-full" onClick={handleCreateCampaign} disabled={isLoading || !user}>
            {isLoading ? "Launching…" : "Launch Campaign"}
          </Button>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
