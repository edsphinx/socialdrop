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
        <meta
          name="fc:miniapp"
          content='{
      "version": "1",
      "imageUrl": "https://socialdrop.live/og-image.png",
      "buttons": [
        {
          "title": "🚩 Start",
          "action": {
            "type": "launch_miniapp",
            "name": "Lanza SocialDrop",
            "url": "https://socialdrop.live/",
            "splashImageUrl": "https://socialdrop.live/og-image.png",
            "splashBackgroundColor": "#101010"
          }
        }
      ]
    }'
        />

        <meta
          name="fc:frame"
          content='{
      "version": "vNext",
      "image": "https://socialdrop.live/og-image.png",
      "buttons": [
        {
          "label": "Lanza SocialDrop",
          "action": "post"
        }
      ],
      "post_url": "https://socialdrop.live/api/frame"
    }'
        />
      </head>
      <body>
        <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
      </body>
    </html>
  );
};

export default SocialDropApp;
