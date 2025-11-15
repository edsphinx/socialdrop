"use client";

import { useMiniAppAuth } from "~~/hooks/useMiniAppAuth";

/**
 * Componente de Login para Base Mini App
 *
 * Features:
 * - Auto-detecta Mini App vs Web
 * - SIWF (Sign In With Farcaster) en Mini App
 * - Conexión de wallet tradicional en web
 * - Progressive onboarding (explorar sin auth)
 * - Prefill de avatar y username del contexto
 */

export function MiniAppLogin() {
  const {
    user,
    loading,
    isMiniApp,
    isAuthenticated,
    isGuest,
    signInWithFarcaster,
    connectWallet,
    signOut,
    canClaim,
  } = useMiniAppAuth();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-3 animate-pulse">
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  // Usuario autenticado
  if (isAuthenticated) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {user.pfpUrl ? (
            <img
              src={user.pfpUrl}
              alt={user.username || "User"}
              className="h-10 w-10 rounded-full border-2 border-blue-500"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {user.username?.[0]?.toUpperCase() || "?"}
            </div>
          )}

          {/* User info */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {user.displayName || user.username || "User"}
            </span>
            {user.address && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {user.address.slice(0, 6)}...{user.address.slice(-4)}
              </span>
            )}
          </div>
        </div>

        {/* Sign out button */}
        <button
          onClick={signOut}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  // Guest mode con prefill
  if (isGuest && user.username) {
    return (
      <div className="flex flex-col gap-4">
        {/* Preview de guest */}
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          {user.pfpUrl && (
            <img
              src={user.pfpUrl}
              alt={user.username}
              className="h-10 w-10 rounded-full border-2 border-blue-300"
            />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              👋 Hey {user.username}!
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              You're in guest mode
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-2">
          <button
            onClick={isMiniApp ? signInWithFarcaster : connectWallet}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
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
                Signing in...
              </span>
            ) : isMiniApp ? (
              "Sign In with Farcaster"
            ) : (
              "Connect Wallet"
            )}
          </button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            {canClaim
              ? "You're ready to claim NFTs!"
              : "Sign in to claim NFTs and track your progress"}
          </p>
        </div>
      </div>
    );
  }

  // No guest mode (web tradicional)
  return (
    <div className="flex flex-col gap-4">
      {/* Warning si NO está en Mini App */}
      {!isMiniApp && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <span className="text-2xl">⚡</span>
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Better experience in Base App!
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Open in Base App for instant sign-in and native sharing.
            </p>
            <a
              href="https://base.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Open in Base App →
            </a>
          </div>
        </div>
      )}

      {/* Connect button */}
      <button
        onClick={connectWallet}
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>

      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        Connect your wallet to claim NFTs and participate in campaigns
      </p>
    </div>
  );
}
