"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { useFarcaster } from "~~/hooks/useFarcaster";

export default function DuelPage() {
  const params = useParams();
  const campaignId = Number(params.campaignId);
  const { user } = useFarcaster();

  const [nftStatus, setNftStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = () => {
    if (user?.fid) {
      setIsLoading(true);
      fetch(`/api/gamification/status?fid=${user.fid}&campaignId=${campaignId}`)
        .then(res => res.json())
        .then(data => setNftStatus(data))
        .finally(() => setIsLoading(false));
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [user, campaignId]);

  // Función para simular la evolución para la demo
  const handleEvolveDemo = async () => {
    const toastId = toast.loading("Forzando evolución para la demo...");
    await fetch("/api/test/evolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tokenId: nftStatus.tokenId,
        secret: process.env.NEXT_PUBLIC_TEST_MINT_SECRET,
      }),
    });
    toast.dismiss(toastId);
    toast.success("¡NFT Evolucionado! Refrescando...");
    fetchStatus(); // Volvemos a cargar el estado para ver el nuevo nivel
  };

  if (isLoading)
    return (
      <div className="text-center p-8">
        <span className="loading loading-spinner"></span>
      </div>
    );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-white">
      <h1 className="text-3xl font-bold mb-4">Guerra de Influencia</h1>

      {nftStatus ? (
        <>
          <img src={nftStatus.imageUrl} alt="Tu NFT" className="w-64 h-64 rounded-xl border-4 border-secondary" />
          <p className="mt-4 text-2xl font-bold">{nftStatus.name}</p>
          <div className="stats bg-primary text-primary-content mt-4">
            <div className="stat">
              <div className="stat-title">Puntaje (Likes)</div>
              <div className="stat-value">{nftStatus.score}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Nivel</div>
              <div className="stat-value">{nftStatus.level}</div>
            </div>
          </div>
          <button className="btn btn-secondary mt-6" onClick={fetchStatus}>
            Actualizar Puntaje
          </button>
          <button className="btn btn-accent mt-2" onClick={handleEvolveDemo}>
            Forzar Evolución (Demo)
          </button>
        </>
      ) : (
        <p>No estás participando en esta campaña. ¡Registra tu cast!</p>
      )}
    </div>
  );
}
