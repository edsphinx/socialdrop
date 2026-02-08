import { createContext, useContext } from "react";
import Farcaster from "@farcaster/miniapp-sdk";

type FarcasterUser = Awaited<typeof Farcaster.context>["user"];

export interface FarcasterContextType {
  user: FarcasterUser | null;
  isLoading: boolean;
}

export const FarcasterContext = createContext<FarcasterContextType>({
  user: null,
  isLoading: true,
});

export const useFarcaster = () => useContext(FarcasterContext);
