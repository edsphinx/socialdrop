import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

// WalletConnect is optional: enabled only when a project id is provided via env.
// We never ship a hardcoded/shared project id (rate-limit + WalletConnect ToS risk).
// In the Farcaster / Base App Mini App context the wallet is provided by the host,
// so WalletConnect is not required for the primary use case.
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID;

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "SocialDrop" }),
    ...(walletConnectProjectId ? [walletConnect({ projectId: walletConnectProjectId })] : []),
  ],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
  },
  ssr: true,
});
