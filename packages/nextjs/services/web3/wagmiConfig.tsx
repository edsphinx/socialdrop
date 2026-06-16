import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

// No hardcoded/shared WalletConnect project id is ever shipped (rate-limit + ToS risk).
// WalletConnect is intentionally omitted: in the Farcaster / Base App Mini App context the
// wallet is provided by the host, and standalone web is covered by injected (MetaMask, etc.)
// and Coinbase Wallet. The WalletConnect connector also accesses `indexedDB` during SSR
// prerender, which crashes the production build — another reason to keep it out until it can
// be added client-only. See docs/superpowers for the relaunch plan.

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors: [injected(), coinbaseWallet({ appName: "SocialDrop" })],
  transports: {
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org"),
  },
  ssr: true,
});
