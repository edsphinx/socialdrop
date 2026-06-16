"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowPathIcon, FireIcon, TrophyIcon } from "@heroicons/react/24/solid";
import { useFarcaster } from "@/hooks/useFarcaster";

interface NftStatus {
  tokenId: number;
  name: string;
  imageUrl: string;
  score: number;
  level: number;
}

interface DuelEntry {
  id: number;
  name: string;
  pfpUrl: string;
  score: number;
  campaignId: number;
  campaignName: string;
}

export default function DuelPage() {
  const params = useParams();
  const campaignId = Number(params.campaignId);
  const { user, isLoading: isUserLoading } = useFarcaster();

  const [playerStatus, setPlayerStatus] = useState<NftStatus | null>(null);
  const [leaderboard, setLeaderboard] = useState<DuelEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notRegistered, setNotRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [castHash, setCastHash] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getUserFid = useCallback(() => {
    return user?.fid ?? null;
  }, [user]);

  const fetchData = useCallback(async () => {
    const fid = getUserFid();
    if (!fid || !campaignId) {
      setIsLoading(false);
      setError("Missing user or campaign data.");
      return;
    }

    setError(null);

    try {
      const [statusRes, duelsRes] = await Promise.all([
        fetch(`/api/gamification/status?fid=${fid}&campaignId=${campaignId}`),
        fetch("/api/duels"),
      ]);

      const statusData = await statusRes.json();
      const duelsData = await duelsRes.json();

      if (statusData.error) {
        if (statusRes.status === 404) {
          setNotRegistered(true);
          setPlayerStatus(null);
        } else {
          setError(statusData.error);
        }
      } else {
        setPlayerStatus(statusData);
        setNotRegistered(false);
      }

      if (duelsData.duels) {
        setLeaderboard(duelsData.duels.filter((d: DuelEntry) => d.campaignId === campaignId));
      }
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  }, [getUserFid, campaignId]);

  useEffect(() => {
    if (isUserLoading) return;
    fetchData();
  }, [fetchData, isUserLoading]);

  const handleRegister = async () => {
    const fid = getUserFid();
    if (!fid || !castHash.trim()) return;

    setIsRegistering(true);
    try {
      const res = await fetch("/api/gamification/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userFid: fid, campaignId, castHash: castHash.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Registered! Your cast is now being tracked.");
        setCastHash("");
        await fetchData();
      } else {
        toast.error(data.error || "Registration failed.");
      }
    } catch {
      toast.error("Could not connect to the server.");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRefreshScore = async () => {
    const fid = getUserFid();
    if (!fid) return;

    setIsRefreshing(true);
    const toastId = toast.loading("Updating score...");
    try {
      const res = await fetch("/api/gamification/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userFid: fid, campaignId }),
      });
      const data = await res.json();
      toast.dismiss(toastId);

      if (data.evolved) {
        toast.success(`Your NFT evolved to Level ${data.level}!`);
      } else {
        toast.success(`Score updated: ${data.score} likes`);
      }

      await fetchData();
    } catch {
      toast.dismiss(toastId);
      toast.error("Could not update score.");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <span className="loading loading-spinner"></span>
      </div>
    );
  }

  if (error) return <div className="text-center p-8 text-error">{error}</div>;

  return (
    <div className="flex flex-col items-center min-h-screen p-4 text-white text-center gap-6">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <FireIcon className="h-8 w-8 text-red-500" />
        War of Influence
      </h1>

      {/* Registration Form */}
      {notRegistered ? (
        <div className="card bg-base-200 w-full max-w-md p-6">
          <h2 className="text-xl font-bold mb-2">Join the Competition</h2>
          <p className="text-sm opacity-70 mb-4">
            Post a cast promoting this campaign, then paste the cast hash below to start competing. Your NFT will evolve
            as you earn likes!
          </p>
          <input
            type="text"
            placeholder="Paste your cast hash (0x...)"
            className="input input-bordered w-full mb-3"
            value={castHash}
            onChange={e => setCastHash(e.target.value)}
          />
          <button
            className="btn btn-primary w-full"
            onClick={handleRegister}
            disabled={isRegistering || !castHash.trim()}
          >
            {isRegistering ? <span className="loading loading-spinner loading-sm"></span> : "Register Cast"}
          </button>
        </div>
      ) : playerStatus ? (
        /* Player Status Card */
        <div className="card bg-base-200 w-full max-w-md p-6">
          <Image
            src={playerStatus.imageUrl}
            alt={playerStatus.name}
            width={192}
            height={192}
            className="w-48 h-48 rounded-xl mx-auto border-4 border-primary shadow-lg"
            unoptimized
          />
          <p className="mt-3 text-lg font-bold">@{user?.username || "you"}</p>
          <div className="stats bg-primary text-primary-content mt-3 w-full">
            <div className="stat">
              <div className="stat-title">Score</div>
              <div className="stat-value">{playerStatus.score}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Level</div>
              <div className="stat-value">{playerStatus.level}</div>
            </div>
          </div>
          <button className="btn btn-secondary w-full mt-3 gap-2" onClick={handleRefreshScore} disabled={isRefreshing}>
            {isRefreshing ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <ArrowPathIcon className="h-5 w-5" />
            )}
            Refresh Score
          </button>
        </div>
      ) : null}

      {/* Leaderboard */}
      <div className="w-full max-w-md">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2 justify-center">
          <TrophyIcon className="h-6 w-6 text-yellow-500" />
          Leaderboard
        </h2>

        {leaderboard.length === 0 ? (
          <p className="text-sm opacity-70">No competitors yet. Be the first!</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, index) => (
              <div key={entry.id} className="flex items-center gap-3 bg-base-200 rounded-lg p-3">
                <span className="text-lg font-bold w-8">{index + 1}.</span>
                <Image
                  src={entry.pfpUrl}
                  alt={entry.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full"
                  unoptimized
                />
                <div className="flex-1 text-left">
                  <p className="font-semibold">{entry.name}</p>
                </div>
                <span className="text-lg font-bold">{entry.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
