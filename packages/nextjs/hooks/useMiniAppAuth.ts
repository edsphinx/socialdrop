"use client";

import { useEffect, useState, useCallback } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useAccount, useConnect, useDisconnect } from "wagmi";

/**
 * Hook de autenticación híbrida para Base Mini App
 *
 * Detecta si está en Mini App y usa SIWF (Sign In With Farcaster),
 * o fallback a conexión tradicional de wallet.
 *
 * Features:
 * - Progressive onboarding (guest mode primero)
 * - Prefill de datos desde contexto
 * - Auto-detección de Mini App vs Web
 * - Sincronización con wallet existente
 */

interface MiniAppUser {
  fid?: number;
  username?: string;
  address?: string;
  pfpUrl?: string;
  displayName?: string;
  isAuthenticated: boolean;
  isGuest: boolean;
  source: "miniapp" | "wallet" | "guest";
}

interface MiniAppContext {
  user?: {
    fid: number;
    username?: string;
    address?: string;
    pfpUrl?: string;
    displayName?: string;
  };
}

export function useMiniAppAuth() {
  const [isMiniApp, setIsMiniApp] = useState(false);
  const [context, setContext] = useState<MiniAppContext | null>(null);
  const [user, setUser] = useState<MiniAppUser>({
    isAuthenticated: false,
    isGuest: true,
    source: "guest",
  });
  const [loading, setLoading] = useState(true);

  // Wagmi hooks para fallback
  const { address: walletAddress, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Detectar si está en Mini App y obtener contexto
  useEffect(() => {
    try {
      // Verificar si sdk está disponible
      if (typeof sdk !== "undefined") {
        setIsMiniApp(true);

        // Obtener contexto del usuario (NO es prueba criptográfica)
        // Solo usar para prefill, NO para autorización
        const miniAppContext = (sdk as any).context;

        if (miniAppContext?.user) {
          setContext(miniAppContext);

          // Prefill con datos del contexto (guest mode)
          setUser({
            fid: miniAppContext.user.fid,
            username: miniAppContext.user.username,
            address: miniAppContext.user.address,
            pfpUrl: miniAppContext.user.pfpUrl,
            displayName: miniAppContext.user.displayName,
            isAuthenticated: false, // Aún no autenticado
            isGuest: true,
            source: "miniapp",
          });
        }

        console.log("[MiniAppAuth] Running in Mini App context");
      } else {
        setIsMiniApp(false);
        console.log("[MiniAppAuth] Running in web context");
      }
    } catch (error) {
      setIsMiniApp(false);
      console.log("[MiniAppAuth] Not in Mini App:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Sincronizar con wallet conectada (para web tradicional)
  useEffect(() => {
    if (!isMiniApp && isConnected && walletAddress) {
      setUser({
        address: walletAddress,
        isAuthenticated: true,
        isGuest: false,
        source: "wallet",
      });
    }
  }, [isMiniApp, isConnected, walletAddress]);

  /**
   * Sign In With Farcaster (SIWF)
   * Solo disponible en Mini App context
   */
  const signInWithFarcaster = useCallback(async () => {
    if (!isMiniApp) {
      console.error("[SIWF] Not available outside Mini App");
      return null;
    }

    try {
      setLoading(true);

      // Llamar a SIWF
      const result = await sdk.actions.signInWithFarcaster();

      if (!result || !(result as any).success) {
        console.error("[SIWF] Failed:", (result as any)?.error);
        return null;
      }

      const authenticatedUser = (result as any).user;

      // Actualizar con usuario autenticado
      setUser({
        fid: authenticatedUser.fid,
        username: authenticatedUser.username,
        address: authenticatedUser.address,
        pfpUrl: authenticatedUser.pfpUrl,
        displayName: authenticatedUser.displayName,
        isAuthenticated: true,
        isGuest: false,
        source: "miniapp",
      });

      console.log("[SIWF] Success:", authenticatedUser);
      return authenticatedUser;
    } catch (error) {
      console.error("[SIWF] Error:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [isMiniApp]);

  /**
   * Conexión tradicional de wallet (fallback para web)
   */
  const connectWallet = useCallback(async () => {
    if (isMiniApp) {
      // En Mini App, usar SIWF en lugar de conectar wallet
      return signInWithFarcaster();
    }

    try {
      setLoading(true);

      // Conectar con primer conector disponible (ej: Coinbase Wallet)
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    } catch (error) {
      console.error("[Wallet] Connect error:", error);
    } finally {
      setLoading(false);
    }
  }, [isMiniApp, signInWithFarcaster, connect, connectors]);

  /**
   * Sign out
   */
  const signOut = useCallback(() => {
    if (isMiniApp) {
      // En Mini App, volver a guest mode con contexto
      if (context?.user) {
        setUser({
          fid: context.user.fid,
          username: context.user.username,
          address: context.user.address,
          pfpUrl: context.user.pfpUrl,
          displayName: context.user.displayName,
          isAuthenticated: false,
          isGuest: true,
          source: "miniapp",
        });
      } else {
        setUser({
          isAuthenticated: false,
          isGuest: true,
          source: "guest",
        });
      }
    } else {
      // En web, desconectar wallet
      disconnect();
      setUser({
        isAuthenticated: false,
        isGuest: true,
        source: "guest",
      });
    }
  }, [isMiniApp, context, disconnect]);

  return {
    // Estado
    user,
    loading,
    isMiniApp,
    isAuthenticated: user.isAuthenticated,
    isGuest: user.isGuest,

    // Datos prefilled (pueden ser spoofed, NO usar para autorización)
    prefillData: context?.user,

    // Métodos
    signInWithFarcaster,
    connectWallet,
    signOut,

    // Helpers
    canClaim: user.isAuthenticated, // Solo usuarios autenticados pueden claim
    canExplore: true, // Guest mode permite explorar
  };
}
