import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import "~~/styles/globals.css";

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

export const metadata = {
  title: "SocialDrop Mini-App",
  description: "SocialDrop Campaign Manager",
  other: {
    "fc:miniapp": JSON.stringify(miniAppConfig),
    "fc:frame": "vNext",
    "fc:frame:image": "https://socialdrop.live/og-image.png",
    "fc:frame:post_url": "https://socialdrop.live/api/frame", // Asegúrate que este endpoint exista
    "fc:frame:button:1": "Lanza SocialDrop", // <-- ESTA LÍNEA RESUELVE EL ERROR DEL BOTÓN
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
