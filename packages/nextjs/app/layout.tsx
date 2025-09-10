import type { Metadata } from "next";
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import "~~/styles/globals.css";

export const metadata: Metadata = {
  title: "SocialDrop",
  description: "Retos y airdrops de NFTs evolutivos en Farcaster",
};

const miniAppConfig = {
  version: "1",
  imageUrl: "https://socialdrop.live/og-image.png",
  buttons: [
    {
      title: "💧 Inicia SocialDrop",
      action: {
        type: "launch_miniapp",
        name: "Lanza SocialDrop",
        url: "https://socialdrop.live/",
        splashImageUrl: "https://socialdrop.live/og-image.png",
        splashBackgroundColor: "#101010",
      },
    },
  ],
};

const SocialDropApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <head>
        <meta property="fc:miniapp" content={JSON.stringify(miniAppConfig)} />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="https://socialdrop.live/og-image.png" />
        <meta property="fc:frame:post_url" content="https://socialdrop.live/api/frame" />
        <meta property="fc:frame:button:1" content="Lanza SocialDrop" />
      </head>
      <body>
        <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
      </body>
    </html>
  );
};

export default SocialDropApp;
