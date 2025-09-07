"use client";

import { useState } from "react";
import toast from "react-hot-toast";

const AdminPage = () => {
  const [campaignName, setCampaignName] = useState("");
  const [castHash, setCastHash] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateCampaign = async () => {
    if (!campaignName || !castHash) {
      toast.error("Por favor, llena todos los campos.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: campaignName, target_cast_hash: castHash }),
      });

      if (!response.ok) {
        throw new Error("Falló la creación de la campaña.");
      }

      const result = await response.json();
      toast.success(`¡Campaña "${result.name}" creada exitosamente!`);
      setCampaignName("");
      setCastHash("");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Panel de Admin - Crear Campaña</h1>
      <div className="flex flex-col gap-4 max-w-md">
        <input
          type="text"
          placeholder="Nombre de la Campaña"
          className="input input-bordered w-full"
          value={campaignName}
          onChange={e => setCampaignName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Hash del Cast Objetivo (ej: 0x...)"
          className="input input-bordered w-full"
          value={castHash}
          onChange={e => setCastHash(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleCreateCampaign} disabled={isLoading}>
          {isLoading ? "Creando..." : "Crear Campaña"}
        </button>
      </div>
    </div>
  );
};

export default AdminPage;
