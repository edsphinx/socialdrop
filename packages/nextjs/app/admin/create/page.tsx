"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import RangeSlider from "react-range-slider-input";
import "react-range-slider-input/dist/style.css";
import { formatEther, parseEther } from "viem";
import { useAccount, useBalance } from "wagmi";
import { useFarcaster } from "~~/hooks/useFarcaster";

// --- Tipos de Datos Locales para Claridad ---
// Se añade 'fid' que es crucial para identificar al creador en el backend.
type FarcasterUser = {
  fid?: number;
  pfp_url?: string;
  display_name?: string;
  username?: string;
};

// --- Constantes para claridad y fácil mantenimiento ---
const FEE_PER_NFT = 0.0001;
const QUANTITY_STOPS = [10, 20, 50, 100, 250, 500, 750, 1000, 2500, 5000];

// --- Sub-componente para la Vista Previa en Vivo ---
const CampaignPreviewCard = ({
  user,
  castContent,
  nftCount,
}: {
  user: FarcasterUser | null;
  castContent: string;
  nftCount: number;
}) => (
  <div className="card bg-base-100 shadow-xl sticky top-24">
    <div className="card-body">
      <h2 className="card-title text-lg mb-4">Vista Previa del Cast</h2>
      <div className="bg-base-200 p-4 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="avatar">
            <div className="mask mask-squircle w-12 h-12">
              <img src={user?.pfp_url || "https://placehold.co/64"} alt="Avatar" />
            </div>
          </div>
          <div>
            <div className="font-bold">{user?.display_name || "Tu Nombre"}</div>
            <div className="text-sm opacity-50">@{user?.username || "tu-usuario"}</div>
          </div>
        </div>
        <p className="mt-4 break-words">{castContent || "¡Gana este NFT exclusivo dando 'like' a mi cast!"}</p>
        <div className="card bg-base-100 shadow-md mt-4">
          <figure>
            {/* Imagen del NFT de ejemplo */}
            <img
              src={`https://placehold.co/600x400/101010/FFF?text=Tu+NFT\\n(${nftCount}+Ediciones)`}
              alt="NFT Preview"
            />
          </figure>
        </div>
      </div>
    </div>
  </div>
);

// --- Sub-componente para mostrar la información del usuario conectado ---
const UserProfileHeader = ({ user, address }: { user: FarcasterUser | null; address?: string }) => {
  if (!user) {
    return null;
  }
  return (
    <div className="text-center mb-6 p-3 bg-base-200 rounded-lg border border-base-300">
      <p className="text-sm text-base-content/70">Conectado como:</p>
      <div className="flex items-center justify-center gap-2 mt-2">
        <div className="avatar">
          <div className="mask mask-squircle w-6 h-6">
            <img src={user.pfp_url} alt="User Avatar" />
          </div>
        </div>
        <span className="font-bold text-primary text-lg">@{user.username}</span>
      </div>
      <p className="font-mono text-xs truncate mt-2 opacity-60">{address}</p>
    </div>
  );
};

// --- Componente Principal ---
export default function CreateCampaignPage() {
  const { user, isLoading: isUserLoading } = useFarcaster();
  const { address } = useAccount();
  const { data: balance } = useBalance({ address: address as `0x${string}` | undefined });

  const [campaignName, setCampaignName] = useState("");
  const [castContent, setCastContent] = useState("");
  const [nftCount, setNftCount] = useState(100);
  const [fee, setFee] = useState(0.01);
  const [isLoading, setIsLoading] = useState(false);

  const [suggestion, setSuggestion] = useState("");
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);

  useEffect(() => {
    const calculatedFee = nftCount * FEE_PER_NFT;
    setFee(Number(calculatedFee.toFixed(4)));
  }, [nftCount]);

  const handleCreateCampaign = async () => {
    // 1. Validaciones del formulario
    if (!user?.fid) {
      toast.error("Usuario de Farcaster no detectado o inválido.");
      return;
    }
    if (!campaignName.trim()) {
      toast.error("Por favor, dale un nombre a tu campaña.");
      return;
    }
    if (!castContent.trim()) {
      toast.error("El contenido del cast de anuncio no puede estar vacío.");
      return;
    }
    if (!hasSufficientBalance) {
      toast.error("No tienes saldo suficiente para pagar el fee.");
      return;
    }

    setIsLoading(true);

    try {
      // 2. Lógica para crear la campaña en el backend
      const campaignData = {
        name: campaignName,
        castContent: castContent,
        nftCount: nftCount,
        fee: fee,
        creatorFid: user.fid,
      };

      // Simulación de llamada a la API
      // TODO: Reemplazar con una llamada real a `fetch('/api/campaigns/create', ...)`
      console.log("Enviando al backend:", campaignData);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simula la espera de la red

      // 3. Lógica para publicar el cast en Farcaster
      // TODO: Implementar la llamada a `publishCast` del hook `useFarcaster`
      console.log("Publicando en Farcaster:", castContent);

      toast.success(`Campaña "${campaignName}" creada y publicada exitosamente!`);

      // Opcional: Limpiar el formulario o redirigir
      setCampaignName("");
      setCastContent("");
    } catch (error) {
      console.error("Error al crear la campaña:", error);
      toast.error(error instanceof Error ? error.message : "Ocurrió un error inesperado.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetSuggestion = async () => {
    if (!castContent.trim() || !campaignName.trim()) {
      toast.error("Por favor, escribe el nombre y contenido del cast antes de pedir una sugerencia.");
      return;
    }
    setIsSuggestionLoading(true);
    setSuggestion("");

    // --- SIMULACIÓN PARA LA DEMO ---
    // Simula una espera de 2.5 segundos, como si estuviera contactando al bot.
    await new Promise(resolve => setTimeout(resolve, 2500));

    const simulatedResponse = `¡Claro! Aquí tienes 3 consejos para tu cast '${campaignName}':
1.  **Haz una Pregunta Directa:** Termina tu cast con una pregunta como "¿Están listos?" para incentivar comentarios y engagement.
2.  **Menciona un Canal Relevante:** Añade un /channel popular en Base (ej: /base, /dev) para aumentar la visibilidad.
3.  **Crea Urgencia:** Usa frases como "Solo los primeros 100 en dar 'like'..." para motivar una acción rápida.`;

    setSuggestion(simulatedResponse);
    toast.success("¡Sugerencia recibida!");
    setIsSuggestionLoading(false);
    // --- FIN DE LA SIMULACIÓN ---
    // try {
    //   const response = await fetch("/api/ai-suggestion", {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({ castContent, campaignName }),
    //   });
    //   const data = await response.json();
    //   if (!response.ok) {
    //     throw new Error(data.error || "Ocurrió un error al contactar al agente de IA.");
    //   }
    //   setSuggestion(data.suggestion);
    //   toast.success("¡Sugerencia recibida!");
    // } catch (error) {
    //   console.error("Error al obtener sugerencia:", error);
    //   toast.error(error instanceof Error ? error.message : "No se pudo obtener la sugerencia.");
    // } finally {
    //   setIsSuggestionLoading(false);
    // }
  };

  const currentIndex = QUANTITY_STOPS.findIndex(stop => stop >= nftCount);
  const handleSliderChange = (value: [number, number]) => {
    const newIndex = value[0];
    setNftCount(QUANTITY_STOPS[newIndex]);
  };

  const handleManualInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Math.max(0, Math.min(9999, Number(e.target.value)));
    setNftCount(num);
  };

  const hasSufficientBalance = balance && fee ? balance.value >= parseEther(fee.toString()) : false;

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* --- Layout de 2 columnas en pantallas medianas y grandes --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* --- Columna 1: Formulario de Creación --- */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <UserProfileHeader user={user} address={address} />

            <h1 className="card-title text-3xl font-bold mb-4">Lanzar Nueva Campaña</h1>

            {/* Nombre */}
            <div className="form-control">
              <label className="label">
                <span className="label-text text-lg">Nombre de la Campaña</span>
              </label>
              <input
                type="text"
                placeholder="Mi Airdrop Increíble"
                className="input input-bordered w-full text-base"
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
              />
            </div>

            {/* Contenido del Cast */}
            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text text-lg">Contenido del Cast de Anuncio</span>
              </label>
              <textarea
                className="textarea textarea-bordered w-full h-24 text-base"
                placeholder="¡Gana este NFT exclusivo dando 'like' a mi cast!"
                value={castContent}
                onChange={e => setCastContent(e.target.value)}
              ></textarea>
              <div className="card-actions justify-end mt-2">
                <button className="btn btn-ghost btn-sm" onClick={handleGetSuggestion} disabled={isSuggestionLoading}>
                  {isSuggestionLoading ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : (
                    "🤖 Obtener Sugerencia de IA"
                  )}
                </button>
              </div>
            </div>

            {/* Contenedor para la Sugerencia de IA */}
            {(isSuggestionLoading || suggestion) && (
              <div className="mt-4 p-4 bg-base-200 rounded-lg">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <span className="text-xl">🤖</span> Sugerencia del Agente
                </h3>
                {isSuggestionLoading ? (
                  <div className="flex items-center justify-center p-4">
                    <span className="loading loading-dots loading-md"></span>
                  </div>
                ) : (
                  <p className="text-base-content/80 whitespace-pre-wrap">{suggestion}</p>
                )}
              </div>
            )}

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">Cantidad de NFTs a repartir</span>
              </label>

              <RangeSlider
                min={0}
                max={QUANTITY_STOPS.length - 1}
                step={1}
                value={[currentIndex > -1 ? currentIndex : 0, 0]}
                onInput={handleSliderChange}
                className="range-slider-primary mt-4"
              />

              <div className="w-full flex justify-between text-xs px-1 mt-2">
                {QUANTITY_STOPS.map(stop => (
                  <button
                    key={stop}
                    onClick={() => setNftCount(stop)}
                    className={`btn btn-xs btn-ghost p-1 ${nftCount === stop ? "text-primary" : ""}`}
                  >
                    {stop}
                  </button>
                ))}
              </div>

              <input
                type="number"
                className="input input-bordered w-full mt-4"
                value={nftCount}
                // Y onChange usa handleManualInputChange
                onChange={handleManualInputChange}
              />
            </div>

            {/* Resumen y Botón de Pago */}
            <div className="mt-8 p-6 bg-base-200 rounded-lg text-center">
              <p className="text-lg">Costo de la Campaña:</p>
              <p className="text-4xl font-extrabold text-primary my-2">{fee} ETH</p>
              {balance && (
                <p className="text-sm opacity-60">
                  Tu Saldo: {parseFloat(formatEther(balance.value)).toFixed(4)} {balance.symbol}
                </p>
              )}
              <div className="card-actions justify-center mt-6">
                <button
                  className="btn btn-primary btn-lg w-full md:w-auto"
                  onClick={handleCreateCampaign}
                  disabled={isLoading || !user || !hasSufficientBalance}
                >
                  {isLoading ? <span className="loading loading-spinner"></span> : "🚀 Pagar y Publicar Campaña"}
                </button>
              </div>
              {address && !hasSufficientBalance && (
                <p className="text-error text-xs mt-2">No tienes saldo suficiente para pagar el fee.</p>
              )}
            </div>
          </div>
        </div>

        {/* --- Columna 2: Vista Previa --- */}
        <div className="hidden md:block">
          <CampaignPreviewCard user={user} castContent={castContent} nftCount={nftCount} />
        </div>
      </div>
    </div>
  );
}
