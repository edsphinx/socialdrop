"use client";

import { motion } from "framer-motion";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";

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

function Section({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <motion.section variants={item} className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-doto text-[11px] text-muted-foreground">{eyebrow}</h2>
      <div className="mt-3 text-[13px] leading-relaxed text-foreground/80">{children}</div>
    </motion.section>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <div className="mx-auto max-w-2xl px-5 pt-6">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
          className="mb-6"
        >
          <h1 className="font-doto text-2xl text-foreground">About SocialDrop</h1>
        </motion.header>

        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          <Section eyebrow="What is SocialDrop?">
            SocialDrop is free, open-source infrastructure for launching engagement-driven NFT airdrop campaigns on
            Farcaster. Instead of distributing tokens to anonymous wallets, creators reward real social engagement — and
            the NFTs evolve on-chain based on the holder&apos;s influence.
          </Section>

          <Section eyebrow="How It Works">
            <ol className="list-decimal space-y-2 pl-5 marker:text-muted-foreground">
              <li>A creator launches a campaign linked to a Farcaster cast</li>
              <li>Users like the cast to become eligible</li>
              <li>Users claim a Level 1 NFT through the Mini-App</li>
              <li>Users post their own promotional cast and register it</li>
              <li>As the cast earns likes, the NFT evolves through levels on-chain</li>
              <li>A public leaderboard tracks the top competitors</li>
            </ol>
          </Section>

          <Section eyebrow="War of Influence">
            The &quot;War of Influence&quot; is what makes SocialDrop different. After claiming an NFT, holders compete
            by promoting the campaign on Farcaster. Their NFT evolves at influence milestones: Level 2 at 10 likes,
            Level 3 at 25 likes, and Level 4 at 50 likes. Each evolution is a permanent on-chain upgrade.
          </Section>

          <Section eyebrow="Built as a Public Good">
            SocialDrop is completely free to use. No fees for creators, no fees for participants. We believe the Base
            ecosystem needs free infrastructure for social engagement. More campaigns mean more users, more
            transactions, and a stronger ecosystem for everyone.
          </Section>

          <Section eyebrow="Technology">
            <ul className="list-disc space-y-1 pl-5 marker:text-muted-foreground">
              <li>Smart contract deployed and verified on Base</li>
              <li>Next.js frontend with Farcaster Mini-App SDK</li>
              <li>Neynar API for Farcaster data verification</li>
              <li>Supabase/Postgres for campaign and score tracking</li>
              <li>Open source under MIT license</li>
            </ul>
          </Section>

          <motion.div variants={item} className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button asChild className="h-11 flex-1 justify-center text-[13px] font-bold">
              <a
                href="https://sepolia.basescan.org/address/0xB246F4D44e02AA578E4CeF9Fca03987Ee23AD7F2"
                target="_blank"
                rel="noopener noreferrer"
              >
                View Contract on Basescan
              </a>
            </Button>
            <Button asChild variant="outline" className="h-11 flex-1 justify-center text-[13px] font-bold">
              <a href="/analytics">Platform Metrics</a>
            </Button>
            <Button asChild variant="outline" className="h-11 flex-1 justify-center text-[13px] font-bold">
              <a href="https://github.com/edsphinx/socialdrop" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
}
