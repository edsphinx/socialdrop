"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Farcaster from "@farcaster/miniapp-sdk";
import toast from "react-hot-toast";

type FarcasterUser = Awaited<typeof Farcaster.context>["user"];
const fc = Farcaster;

export default function MiniAppDashboard() {
  const searchParams = useSearchParams();
  const campaignId = Number(searchParams.get("campaignId"));

  const [campaignData, setCampaignData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);

  // 1. Inicializar la Mini-App y obtener datos del usuario
  useEffect(() => {
    fc.actions.ready();
    fc.context
      .then(context => {
        if (context.user) {
          setUser(context.user);
        }
      })
      .catch(err => console.error("Error getting user context:", err));
  }, []);

  // 2. Cargar datos de la campaña desde la API
  useEffect(() => {
    // Solo hacemos fetch si tenemos un campaignId válido
    if (campaignId > 0) {
      setIsLoading(true);
      fetch(`/api/campaign-status?id=${campaignId}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) throw new Error(data.error);
          setCampaignData(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error("Error fetching campaign data:", err);
          toast.error("No se pudo cargar la campaña.");
          setIsLoading(false);
        });
    } else {
      setIsLoading(false); // No hay campaignId, dejamos de cargar
    }
  }, [campaignId]);

  // 3. Función para reclamar el NFT
  const handleClaim = async () => {
    if (!user?.fid) {
      toast.error("No se pudo obtener tu usuario de Farcaster.");
      return;
    }

    setIsClaiming(true);
    const toastId = toast.loading("Reclamando tu NFT...");

    try {
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userFid: user.fid, campaignId: campaignId }),
      });

      const result = await response.json();
      toast.dismiss(toastId);

      if (!response.ok) {
        throw new Error(result.message || "Falló el reclamo.");
      }

      toast.success("¡NFT reclamado con éxito!");
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message);
    } finally {
      setIsClaiming(false);
    }
  };

  if (!campaignId) {
    return (
      <div className="p-4 text-center text-white">
        Bienvenido a SocialDrop. Por favor, accede a través de una campaña.
      </div>
    );
  }

  if (isLoading) return <div className="p-4 text-center text-white">Cargando Campaña...</div>;
  if (!campaignData) return <div className="p-4 text-center text-white">No se encontró la campaña.</div>;

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-4">{campaignData?.name}</h1>
      <p>
        Progreso: {campaignData?.progress} / {campaignData?.total}
      </p>

      {/* Mostramos los ganadores recientes si existen */}
      {campaignData.recentWinners && campaignData.recentWinners.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold">Últimos Ganadores:</h2>
          <ul className="list-disc pl-5 mt-2">
            {campaignData.recentWinners.map((winner: any) => (
              <li key={winner.tokenId}>@{winner.username}</li>
            ))}
          </ul>
        </div>
      )}

      <button className="btn btn-primary mt-8 w-full" onClick={handleClaim} disabled={isClaiming || !user}>
        {isClaiming ? "Reclamando..." : "🎁 Reclamar mi NFT"}
      </button>

      {user && <p className="mt-4 text-sm text-center">Conectado como: @{user.username}</p>}
    </div>
  );
}
