"use client";

import { useEffect, useState } from "react";
import Farcaster from "@farcaster/miniapp-sdk";
import { FarcasterContext } from "~~/hooks/useFarcaster";

type FarcasterUser = Awaited<typeof Farcaster.context>["user"];

export const FarcasterProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Farcaster.actions.ready();
    Farcaster.context
      .then(context => {
        if (context?.user) {
          setUser(context.user);
        }
      })
      .catch(err => console.error("Error getting user context:", err))
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return <FarcasterContext.Provider value={{ user, isLoading }}>{children}</FarcasterContext.Provider>;
};
