import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import "~~/styles/globals.css";

export const metadata = {
  title: "SocialDrop Mini-App",
  description: "SocialDrop Campaign Manager",
};

const SocialDropApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <head>
        <meta name="fc:miniapp" content="<stringified MiniAppEmbed JSON>" />
        <meta name="fc:frame" content="<stringified MiniAppEmbed JSON>" />
      </head>
      <body>
        <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
      </body>
    </html>
  );
};

export default SocialDropApp;
