import { createContext, useContext } from "react";
import Farcaster from "@farcaster/miniapp-sdk";

type FarcasterUser = Awaited<typeof Farcaster.context>["user"];

// Definimos el Tipo para nuestro Contexto
export interface FarcasterContextType {
  user: FarcasterUser | null;
  isLoading: boolean;
}

// Creamos y exportamos el Contexto para que el Provider lo use
export const FarcasterContext = createContext<FarcasterContextType>({
  user: null,
  isLoading: true,
});

// Creamos y exportamos el Hook para que los componentes lo usen
export const useFarcaster = () => useContext(FarcasterContext);
