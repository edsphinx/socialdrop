"use client";

import { useEffect } from "react";
import { sdk } from "@farcaster/miniapp-sdk";

/**
 * MiniKitInitializer - Notifica a Base App que la aplicación está lista
 *
 * Este componente debe ser renderizado una sola vez en el layout root.
 * Llama a sdk.actions.ready() para ocultar el splash screen y mostrar la app.
 */
export function MiniKitInitializer() {
  useEffect(() => {
    // Notificar a Base App que la app está lista
    try {
      sdk.actions.ready();
      console.log("[MiniKit] App initialized and ready");
    } catch (error) {
      // Si no está en Mini App context, es esperado que falle
      console.log("[MiniKit] Not running in Mini App context");
    }
  }, []);

  // No renderiza nada, solo inicializa
  return null;
}
