import { Doto, Inter_Tight } from "next/font/google";
import type { Metadata } from "next";
import { AppProviders } from "@/components/AppProviders";
import { ThemeProvider } from "@/components/ThemeProvider";
import "@/styles/globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter-tight",
});

const doto = Doto({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-doto",
});

export const metadata: Metadata = {
  title: "SocialDrop",
  description: "Engagement-driven NFT airdrops on Farcaster",
};

const miniAppConfig = {
  version: "1",
  imageUrl: "https://socialdrop.live/og-image.png",
  buttons: [
    {
      title: "Launch SocialDrop",
      action: {
        type: "launch_miniapp",
        name: "Launch SocialDrop",
        url: "https://socialdrop.live/",
        splashImageUrl: "https://socialdrop.live/og-image.png",
        splashBackgroundColor: "#101010",
      },
    },
  ],
};

const SocialDropApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className={`${interTight.variable} ${doto.variable}`} data-theme="dark">
      <head>
        <meta property="fc:miniapp" content={JSON.stringify(miniAppConfig)} />
        <meta property="fc:frame" content="vNext" />
        <meta property="fc:frame:image" content="https://socialdrop.live/og-image.png" />
        <meta property="fc:frame:post_url" content="https://socialdrop.live/api/frame" />
        <meta property="fc:frame:button:1" content="Launch SocialDrop" />
      </head>
      <body className={interTight.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} forcedTheme="dark">
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default SocialDropApp;
