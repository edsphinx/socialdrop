import type { Metadata } from "next";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import "~~/styles/globals.css";
import "@coinbase/onchainkit/styles.css";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://socialdrop.live";

export const metadata: Metadata = {
  title: "SocialDrop - Farcaster NFT Rewards",
  description: "Get rewarded with evolving NFTs for your Farcaster engagement",

  // Open Graph metadata
  openGraph: {
    title: "SocialDrop",
    description: "Your engagement, your evolving NFT",
    images: [`${APP_URL}/og-image.png`],
    type: "website",
    url: APP_URL,
  },

  // Twitter Card metadata
  twitter: {
    card: "summary_large_image",
    title: "SocialDrop",
    description: "Get rewarded with evolving NFTs for your Farcaster engagement",
    images: [`${APP_URL}/og-image.png`],
  },

  // Farcaster Mini App embed metadata
  other: {
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: `${APP_URL}/embed.png`,
      button: {
        title: "Open SocialDrop",
        action: {
          type: "launch",
        },
      },
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: "#6366f1",
    }),
  },
};

const SocialDropApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>
        <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
      </body>
    </html>
  );
};

export default SocialDropApp;
