"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
// La importación por defecto es el objeto SDK ya inicializado
import Farcaster from "@farcaster/miniapp-sdk";
import toast from "react-hot-toast";

// app/miniapp/[campaignId]/page.tsx

type FarcasterUser = Awaited<typeof Farcaster.context>["user"];

const fc = Farcaster;

export default function MiniAppDashboard() {
  const params = useParams();
  const campaignId = Number(params.campaignId);

  const [campaignData, setCampaignData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [user, setUser] = useState<FarcasterUser | null>(null);

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

  useEffect(() => {
    if (campaignId) {
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
    }
  }, [campaignId]);

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

  if (isLoading) return <div className="p-4 text-center">Cargando Campaña...</div>;
  if (!campaignData) return <div className="p-4 text-center">No se encontró la campaña.</div>;

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-bold mb-4">{campaignData?.name}</h1>
      <p>
        Progreso: {campaignData?.progress} / {campaignData?.total}
      </p>

      <button className="btn btn-primary mt-6 w-full" onClick={handleClaim} disabled={isClaiming || !user}>
        {isClaiming ? "Reclamando..." : "🎁 Reclamar mi NFT"}
      </button>

      {user && <p className="mt-4 text-sm text-center">Conectado como: @{user.username}</p>}
    </div>
  );
}
