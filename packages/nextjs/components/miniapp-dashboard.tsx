"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Farcaster from "@farcaster/miniapp-sdk";
import toast from "react-hot-toast";

type FarcasterUser = Awaited<typeof Farcaster.context>["user"];

type NftData = {
  name: string;
  image: string;
  tokenId: number;
  transactionHash: string;
};

const fc = Farcaster;

export default function MiniAppDashboard() {
  const params = useParams();
  const campaignId = Number(params.campaignId);

  const [campaignData, setCampaignData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);
  const [mintedNFT, setMintedNFT] = useState<NftData | null>(null);

  useEffect(() => {
    fc.actions.ready();
    fc.context
      .then(context => {
        if (context.user) setUser(context.user);
      })
      .catch(err => console.error("Error getting user context:", err));
  }, []);

  useEffect(() => {
    if (campaignId > 0) {
      setIsLoading(true);
      fetch(`/api/campaign-status?id=${campaignId}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          setCampaignData(data);
        })
        .catch(err => toast.error(`No se pudo cargar la campaña. ${err}`))
        .finally(() => setIsLoading(false));
    }
  }, [campaignId]);

  const handleClaim = async () => {
    if (!user?.fid) return toast.error("Usuario de Farcaster no encontrado.");

    setIsClaiming(true);
    const toastId = toast.loading("Reclamando tu NFT...");

    try {
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userFid: user.fid, campaignId: campaignId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Falló el reclamo.");

      toast.dismiss(toastId);
      toast.success("¡NFT reclamado con éxito!");

      const metadataResponse = await fetch(`/api/metadata/1`);
      const metadata = await metadataResponse.json();

      setMintedNFT({
        name: metadata.name,
        image: metadata.image.replace("ipfs://", "https://ipfs.io/ipfs/"),
        tokenId: result.tokenId,
        transactionHash: result.transactionHash,
      });
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message);
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen text-white">Cargando...</div>;
  if (!campaignData) return <div className="p-4 text-center text-white">No se encontró la campaña.</div>;

  // --- EL NUEVO JSX MEJORADO ---
  return (
    <div className="flex flex-col justify-between min-h-screen p-6 text-white text-center">
      <div className="flex-grow flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold">{campaignData?.name}</h1>
        <p className="mt-2 text-gray-400">
          {campaignData?.progress} / {campaignData?.total} reclamados
        </p>
        <progress
          className="progress progress-primary w-full mt-4"
          value={campaignData?.progress}
          max={campaignData?.total}
        ></progress>
      </div>

      <div className="flex-shrink-0">
        {mintedNFT ? (
          <div className="flex flex-col items-center">
            <h2 className="font-bold mb-4">¡Felicidades! Aquí está tu NFT:</h2>
            <img src={mintedNFT.image} alt={mintedNFT.name} className="w-48 h-48 rounded-lg border-2 border-primary" />
            <p className="mt-2 font-bold">{mintedNFT.name}</p>
            <a
              href={`https://sepolia.basescan.org/tx/${mintedNFT.transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-outline w-full mt-4"
            >
              Ver en Basescan
            </a>
          </div>
        ) : (
          <button className="btn btn-primary btn-lg w-full" onClick={handleClaim} disabled={isClaiming || !user}>
            {isClaiming ? "Reclamando..." : "🎁 Reclamar mi NFT"}
          </button>
        )}
        {user && <p className="mt-4 text-xs text-gray-500">Conectado como: @{user.username}</p>}
      </div>
    </div>
  );
}
