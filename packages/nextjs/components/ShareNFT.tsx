"use client";

import { useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniAppAuth } from "~~/hooks/useMiniAppAuth";

/**
 * Componente de Share viral para NFTs
 *
 * Features:
 * - Share nativo en Base App/Farcaster
 * - Mensajes virales con call-to-action
 * - Tracking de shares para analytics
 * - Preview antes de compartir
 * - Variaciones de mensajes (A/B testing)
 * - Referral tracking integrado
 */

interface ShareNFTProps {
  nftLevel: number;
  campaignName: string;
  campaignId: number;
  nftImageUrl: string;
  userAddress?: string;
  onShareSuccess?: (castHash: string) => void;
}

// Variaciones de mensajes para viralidad
const SHARE_TEMPLATES = [
  {
    id: "evolution",
    getText: (level: number, campaign: string) =>
      `Just evolved my NFT to Level ${level} on SocialDrop! 🎉\n\nCampaign: ${campaign}\n\nYour engagement = Your evolving NFT 💎`,
  },
  {
    id: "achievement",
    getText: (level: number, campaign: string) =>
      `Achievement unlocked! 🏆\n\nLevel ${level} NFT from "${campaign}"\n\nGet yours on SocialDrop! Every like evolves your NFT ⚡`,
  },
  {
    id: "flex",
    getText: (level: number) =>
      level >= 3
        ? `Rare NFT Alert! 🔥\n\nJust got a Level ${level} NFT on SocialDrop\n\nOnly the most engaged get this rarity 💎`
        : `Building my NFT collection on SocialDrop! 🚀\n\nLevel ${level} and evolving...\n\nYour social activity = Your rewards 🎁`,
  },
];

export function ShareNFT({
  nftLevel,
  campaignName,
  campaignId,
  nftImageUrl,
  userAddress,
  onShareSuccess,
}: ShareNFTProps) {
  const { isMiniApp, user } = useMiniAppAuth();
  const [sharing, setSharing] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [lastShared, setLastShared] = useState<Date | null>(null);

  // Seleccionar template de mensaje (rotación o basado en level)
  const selectedTemplate =
    nftLevel >= 3
      ? SHARE_TEMPLATES[2] // Flex para NFTs raros
      : SHARE_TEMPLATES[shareCount % 2]; // Rotar entre otros

  const shareText = selectedTemplate.getText(nftLevel, campaignName);

  /**
   * Compartir NFT usando MiniKit SDK
   */
  const handleShare = async () => {
    if (!isMiniApp) {
      // Fallback para web (native share o copy link)
      handleWebShare();
      return;
    }

    try {
      setSharing(true);

      // Crear referral link si hay usuario
      const referralCode = userAddress ? userAddress.slice(2, 10) : "";
      const shareUrl = `https://socialdrop.live/campaigns/${campaignId}${
        referralCode ? `?ref=${referralCode}` : ""
      }`;

      // Compartir usando MiniKit
      const result = await sdk.actions.share({
        text: shareText,
        embeds: [
          {
            url: nftImageUrl, // Imagen del NFT
          },
          {
            url: shareUrl, // Link con referral
          },
        ],
      });

      if ((result as any).success) {
        const castHash = (result as any).castHash;

        console.log("[Share] Success:", castHash);

        // Track share
        trackShare(castHash);

        // Callback de éxito
        if (onShareSuccess) {
          onShareSuccess(castHash);
        }

        // Actualizar estado
        setShareCount(prev => prev + 1);
        setLastShared(new Date());

        // Mostrar feedback
        showShareSuccess();
      } else {
        console.error("[Share] Failed:", (result as any).error);
        showShareError();
      }
    } catch (error) {
      console.error("[Share] Error:", error);
      showShareError();
    } finally {
      setSharing(false);
    }
  };

  /**
   * Fallback share para web
   */
  const handleWebShare = async () => {
    const shareUrl = `https://socialdrop.live/campaigns/${campaignId}`;

    // Usar Web Share API si está disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SocialDrop - Level ${nftLevel} NFT`,
          text: shareText,
          url: shareUrl,
        });

        setShareCount(prev => prev + 1);
        setLastShared(new Date());
        showShareSuccess();
      } catch (error) {
        // Usuario canceló o error
        console.log("[Share] Web share cancelled or failed");
      }
    } else {
      // Copiar al clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        alert("Share message copied to clipboard! 📋");
      } catch (error) {
        alert("Unable to copy to clipboard");
      }
    }
  };

  /**
   * Track share para analytics
   */
  const trackShare = async (castHash: string) => {
    try {
      await fetch("/api/analytics/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          nftLevel,
          castHash,
          userAddress,
          template: selectedTemplate.id,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("[Analytics] Share tracking failed:", error);
    }
  };

  /**
   * Mostrar feedback de éxito
   */
  const showShareSuccess = () => {
    // Aquí puedes usar toast, confetti, etc.
    if (typeof window !== "undefined") {
      // Ejemplo simple con alert (mejor usar toast library)
      setTimeout(() => {
        alert("🎉 Shared successfully! Your network will love this.");
      }, 100);
    }
  };

  /**
   * Mostrar feedback de error
   */
  const showShareError = () => {
    alert("😅 Share failed. Please try again.");
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Preview del share */}
      <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
        <div className="flex items-start gap-3">
          {/* Avatar del usuario o placeholder */}
          {user.pfpUrl ? (
            <img src={user.pfpUrl} alt="" className="h-10 w-10 rounded-full" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
          )}

          {/* Texto del share */}
          <div className="flex-1">
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-line">{shareText}</p>

            {/* Preview de imagen */}
            <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <img src={nftImageUrl} alt={`Level ${nftLevel} NFT`} className="w-full h-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {shareCount > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>✅ Shared {shareCount} time{shareCount !== 1 ? "s" : ""}</span>
          {lastShared && <span>Last: {lastShared.toLocaleTimeString()}</span>}
        </div>
      )}

      {/* Share button */}
      <button
        onClick={handleShare}
        disabled={sharing}
        className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {sharing ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Sharing...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share Your NFT {nftLevel >= 3 && "🔥"}
          </>
        )}
      </button>

      {/* Incentive message */}
      {shareCount === 0 && (
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          💡 Share to inspire others! Every share helps grow the community
        </p>
      )}

      {shareCount > 0 && shareCount < 3 && (
        <p className="text-xs text-center text-green-600 dark:text-green-400">
          🎉 Awesome! Share {3 - shareCount} more for maximum reach
        </p>
      )}

      {shareCount >= 3 && (
        <p className="text-xs text-center text-purple-600 dark:text-purple-400 font-semibold">
          ⭐ Super Sharer! You're driving viral growth 🚀
        </p>
      )}
    </div>
  );
}
