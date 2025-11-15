"use client";

import { useState, useEffect } from "react";
import { useMiniAppAuth } from "~~/hooks/useMiniAppAuth";

/**
 * Sistema de Referidos para viralidad
 *
 * Features:
 * - Link de referido único por usuario
 * - Tracking de referidos
 * - Rewards por referir (bonus NFT evolution, etc.)
 * - Leaderboard de top referrers
 * - Share viral integrado
 */

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  rewardsEarned: number;
  rank?: number;
}

export function ReferralSystem() {
  const { user, isAuthenticated } = useMiniAppAuth();
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralLink, setReferralLink] = useState<string>("");
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    rewardsEarned: 0,
  });
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Generar referral code desde address
  useEffect(() => {
    if (user.address) {
      // Usar primeros 8 chars del address (sin 0x)
      const code = user.address.slice(2, 10).toLowerCase();
      setReferralCode(code);

      // Crear link de referido
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://socialdrop.live";
      setReferralLink(`${baseUrl}?ref=${code}`);
    }
  }, [user.address]);

  // Cargar stats de referidos
  useEffect(() => {
    if (!isAuthenticated || !user.address) {
      setLoading(false);
      return;
    }

    const loadStats = async () => {
      try {
        const response = await fetch(`/api/referrals/stats?address=${user.address}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error("[Referrals] Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [isAuthenticated, user.address]);

  // Copiar link al clipboard
  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert("Failed to copy link");
    }
  };

  // Share referral link
  const shareReferralLink = async () => {
    const shareText = `Join me on SocialDrop! 🎉\n\nGet rewarded with evolving NFTs for your Farcaster engagement.\n\nUse my referral link to get a bonus when you claim your first NFT! 🚀`;

    // Usar Web Share API si está disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join SocialDrop!",
          text: shareText,
          url: referralLink,
        });
      } catch (error) {
        console.log("[Share] Cancelled or failed");
      }
    } else {
      // Fallback: copiar
      copyReferralLink();
    }
  };

  // UI para usuarios no autenticados
  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🎁</span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Referral Program</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Invite friends, earn rewards</p>
          </div>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
          Sign in to get your unique referral link and start earning rewards when your friends join!
        </p>

        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>Both you and your friend get bonus evolution points!</span>
        </div>
      </div>
    );
  }

  // UI para usuarios autenticados
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border-2 border-purple-200 dark:border-purple-800 p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🚀</span>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Your Referral Link</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Share and earn together</p>
          </div>
        </div>

        {/* Referral link */}
        <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
          <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white truncate">
            {referralLink}
          </code>

          <button
            onClick={copyReferralLink}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
          >
            {copied ? "Copied! ✓" : "Copy"}
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={shareReferralLink}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
          >
            Share Link 📢
          </button>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {/* Total referrals */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Referrals</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalReferrals}</p>
          </div>

          {/* Active referrals */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.activeReferrals}</p>
          </div>

          {/* Rewards earned */}
          <div className="col-span-2 rounded-lg border border-purple-200 dark:border-purple-800 p-4 bg-purple-50 dark:bg-purple-900/20">
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-1">Evolution Points Earned</p>
            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
              +{stats.rewardsEarned} <span className="text-lg">⚡</span>
            </p>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">How it works:</h4>

        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-lg">1️⃣</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Share your unique referral link with friends
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-lg">2️⃣</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              They sign up and claim their first NFT
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span className="text-lg">3️⃣</span>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Both of you get <strong>+10 evolution points</strong>! ⚡
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            💡 <strong>Bonus:</strong> Top 10 referrers each month get exclusive legendary NFTs!
          </p>
        </div>
      </div>
    </div>
  );
}
