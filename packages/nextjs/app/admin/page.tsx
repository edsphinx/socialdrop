"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

export default function AdminDashboard() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Función para obtener las campañas desde tu API
  const fetchCampaigns = () => {
    setIsLoading(true);
    fetch("/api/campaigns")
      .then(res => res.json())
      .then(data => {
        setCampaigns(data);
        setIsLoading(false);
      })
      .catch(() => {
        toast.error("No se pudieron cargar las campañas.");
        setIsLoading(false);
      });
  };

  // Cargar las campañas cuando el componente se monte
  useEffect(() => {
    fetchCampaigns();
  }, []);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard del Creador</h1>
        <Link href="/admin/create" passHref>
          <button className="btn btn-primary mt-4 md:mt-0">+ Crear Nueva Campaña</button>
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Mis Campañas</h2>
        {isLoading ? (
          <div className="text-center">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.length > 0 ? (
              campaigns.map(campaign => (
                <div key={campaign.id} className="card bg-base-100 shadow-md">
                  <div className="card-body">
                    <h3 className="card-title">{campaign.name}</h3>
                    <p>Estado: {campaign.is_active ? "Activa" : "Finalizada"}</p>
                    <p>
                      {campaign._count?.nfts_minted || 0} / {campaign.max_mints} NFTs reclamados
                    </p>
                    <div className="card-actions justify-end">
                      <Link href={`/c/${campaign.id}`} passHref>
                        <button className="btn btn-secondary btn-sm">Ver Mini-App</button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p>Aún no has creado ninguna campaña.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
