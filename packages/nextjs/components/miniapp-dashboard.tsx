"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import Farcaster, { sdk } from "@farcaster/miniapp-sdk";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FarcasterUser = Awaited<typeof Farcaster.context>["user"];

type NftData = {
  name: string;
  image: string;
  tokenId: number;
  transactionHash: string;
};

const fc = Farcaster;

export default function MiniAppDashboard() {
  const params = useParams();
  const campaignId = Number(params.campaignId);

  const [campaignData, setCampaignData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [mintedNFT, setMintedNFT] = useState<NftData | null>(null);

  useEffect(() => {
    fc.actions.ready();
    fc.context
      .then(context => {
        if (context.user) setUser(context.user);
      })
      .catch(err => console.error("Error getting user context:", err));
  }, []);

  useEffect(() => {
    if (campaignId > 0) {
      setIsLoading(true);
      fetch(`/api/campaign-status?id=${campaignId}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          setCampaignData(data);
        })
        .catch(err => toast.error(`Could not load campaign. ${err}`))
        .finally(() => setIsLoading(false));
    }
  }, [campaignId]);

  const handleClaim = async () => {
    if (!user?.fid) return toast.error("Farcaster user not found.");

    setIsClaiming(true);
    const toastId = toast.loading("Claiming your NFT...");

    try {
      const response = await sdk.quickAuth.fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: campaignId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Claim failed.");

      toast.dismiss(toastId);
      toast.success("NFT claimed successfully!");

      const metadataResponse = await fetch(`/api/metadata/1`);
      const metadata = await metadataResponse.json();

      setMintedNFT({
        name: metadata.name,
        image: metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/"),
        tokenId: result.tokenId,
        transactionHash: result.transactionHash,
      });
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message);
    } finally {
      setIsClaiming(false);
    }
  };

  const progress = Number(campaignData?.progress ?? 0);
  const total = Number(campaignData?.total ?? 0);
  const pct = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 pb-8 pt-4 text-foreground">
      {/* Back affordance */}
      <div className="flex items-center gap-2 py-2">
        <Link
          href="/"
          aria-label="Go back"
          className="flex size-9 items-center justify-center rounded-md text-2xl leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          ‹
        </Link>
        <span className="text-sm font-semibold text-foreground/90">Claim</span>
      </div>

      {isLoading ? (
        <ClaimSkeleton />
      ) : !campaignData ? (
        <NotFound />
      ) : mintedNFT ? (
        <Reveal campaignId={campaignId} nft={mintedNFT} />
      ) : (
        <PreClaim
          name={campaignData?.name}
          progress={progress}
          total={total}
          pct={pct}
          username={user?.username}
          disabled={isClaiming || !user}
          isClaiming={isClaiming}
          onClaim={handleClaim}
        />
      )}
    </div>
  );
}

/* ---------- Pre-claim state ---------- */

function PreClaim({
  name,
  progress,
  total,
  pct,
  username,
  disabled,
  isClaiming,
  onClaim,
}: {
  name?: string;
  progress: number;
  total: number;
  pct: number;
  username?: string;
  disabled: boolean;
  isClaiming: boolean;
  onClaim: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center">
        <span className="font-doto text-xs text-accent">Airdrop</span>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-foreground">{name}</h1>

        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-doto">Claimed</span>
            <span className="tabular-nums">
              {progress} / {total}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 space-y-3">
        <Button
          size="lg"
          className="h-12 w-full text-base font-bold"
          onClick={onClaim}
          disabled={disabled}
          aria-busy={isClaiming}
        >
          {isClaiming ? "Claiming…" : "Claim my NFT"}
        </Button>
        {username && (
          <p className="text-center text-xs text-muted-foreground">
            Connected as <span className="text-foreground/80">@{username}</span>
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- Post-claim reveal ---------- */

function Reveal({ campaignId, nft }: { campaignId: number; nft: NftData }) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center">
        {/* Gold square-medal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: [0.9, 1.04, 1], opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          className="relative flex size-44 items-center justify-center rounded-xl border-2 border-accent bg-card shadow-[0_0_30px_rgba(255,209,47,0.35)]"
        >
          <Image
            src={nft.image}
            alt={nft.name}
            width={176}
            height={176}
            className="size-full rounded-[10px] object-cover"
            unoptimized
          />
          {/* Level-1 gold badge */}
          <span className="absolute -right-3 -top-3 flex size-9 items-center justify-center rounded-md bg-accent text-base font-black text-accent-foreground">
            1
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.18, ease: [0.4, 0, 0.2, 1] }}
          className="mt-6 text-center"
        >
          <span className="font-doto text-xs text-accent">Claimed</span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">{nft.name}</h2>
        </motion.div>
      </div>

      <div className="flex-shrink-0 space-y-3">
        <Button asChild variant="outline" size="lg" className="h-11 w-full">
          <a href={`https://sepolia.basescan.org/tx/${nft.transactionHash}`} target="_blank" rel="noopener noreferrer">
            View on Basescan
          </a>
        </Button>

        <Button
          asChild
          size="lg"
          className="h-12 w-full bg-accent text-base font-bold text-accent-foreground hover:bg-accent/90"
        >
          <Link href={`/duel/${campaignId}`}>Enter War of Influence</Link>
        </Button>

        <div className="rounded-xl border border-border bg-muted p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your NFT is at <span className="font-semibold text-accent">Level 1</span>. Post a cast promoting this
            campaign and register it to start competing!
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Loading + empty states ---------- */

function ClaimSkeleton() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-label="Loading campaign">
      <div className="flex flex-1 flex-col justify-center">
        <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-9 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-8 space-y-2">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-1.5 w-full animate-pulse rounded-full bg-muted" />
        </div>
      </div>
      <div className="h-12 w-full animate-pulse rounded-md bg-muted" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className={cn("flex size-16 items-center justify-center rounded-xl border border-border bg-muted")}>
        <span className="text-3xl text-muted-foreground">?</span>
      </div>
      <h1 className="mt-4 text-xl font-bold text-foreground">Campaign not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">This drop doesn&apos;t exist or has ended.</p>
      <Button asChild variant="outline" className="mt-6">
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}
