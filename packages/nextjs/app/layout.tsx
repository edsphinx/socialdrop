import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import "~~/styles/globals.css";

// Mantenemos esto para el título y la descripción, que funcionan bien.
export const metadata = {
  title: "SocialDrop Mini-App",
  description: "SocialDrop Campaign Manager",
};

// El contenido del Mini-App sigue siendo válido.
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
