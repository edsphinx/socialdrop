// app/layout.tsx
import { ScaffoldEthAppWithProviders } from "~~/components/ScaffoldEthAppWithProviders";
import "~~/styles/globals.css";

export const metadata = {
  title: "SocialDrop Mini-App",
  description: "SocialDrop Campaign Manager",
};

const ScaffoldEthApp = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning>
      <body>
        {/* Mantenemos los Providers para toda la funcionalidad de wallet y blockchain,
            pero eliminamos Header, Footer, etc., para una UI limpia de Mini-App. */}
        <ScaffoldEthAppWithProviders>{children}</ScaffoldEthAppWithProviders>
      </body>
    </html>
  );
};

export default ScaffoldEthApp;
