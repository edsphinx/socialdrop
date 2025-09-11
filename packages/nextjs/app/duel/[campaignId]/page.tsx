"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { FireIcon } from "@heroicons/react/24/solid";
import { useFarcaster } from "~~/hooks/useFarcaster";

// La siguiente es una version para Demo TODO: Implementar Producto Real

// --- Tipos de Datos para mayor claridad ---
interface NftStatus {
  tokenId: number;
  name: string;
  imageUrl: string;
  score: number;
  level: number;
}

// 1. Centralizamos las URLs de las imágenes de cada nivel aquí
const LEVEL_IMAGES: { [key: number]: string } = {
  1: "https://ipfs.io/ipfs/bafybeiakfsnmcuqenkwsbhtpi4mh5dq62aho3g2svww5hfw5b4lodgfh3m",
  2: "https://ipfs.io/ipfs/bafybeic3rbxwu4tnhiozdpaorom4fk5aj2ue3utwgbxcfnyqtweoy2e4d4",
  3: "https://ipfs.io/ipfs/bafybeicqqoskrn2t46kztiz3utes3rrbrlbgkflmafzy5nfjxcs3a2fnbm",
  4: "https://ipfs.io/ipfs/bafybeihj4kvd47itz6dzt5zh4o4ze72f3ybn3fhaadlwwjxh4r4utactmy",
};

// --- Componente para mostrar a cada duelista ---
const DuelistCard = ({
  name,
  imageUrl,
  score,
  level,
  onAddLike,
  isPlayer,
}: {
  name: string;
  imageUrl: string;
  score: number;
  level: number;
  onAddLike: () => void;
  isPlayer: boolean;
}) => (
  <div className="w-full">
    <img
      src={imageUrl}
      alt={name}
      className={`w-full h-auto rounded-xl border-4 ${isPlayer ? "border-primary" : "border-secondary"} shadow-lg`}
    />
    <p className="mt-4 text-xl font-bold">{name}</p>
    <div className={`stats ${isPlayer ? "bg-primary" : "bg-secondary"} text-primary-content mt-2 w-full`}>
      <div className="stat">
        <div className="stat-title">Puntaje</div>
        <div className="stat-value">{score}</div>
      </div>
      <div className="stat">
        <div className="stat-title">Nivel</div>
        <div className="stat-value">{level}</div>
      </div>
    </div>
    <button className="btn btn-success w-full mt-2" onClick={onAddLike}>
      +1 Like (Simulación)
    </button>
  </div>
);

export default function DuelPage() {
  const params = useParams();
  const campaignId = Number(params.campaignId);
  const { user, isLoading: isUserLoading } = useFarcaster();

  // Estado para nuestro jugador (el usuario real)
  const [playerStatus, setPlayerStatus] = useState<NftStatus | null>(null);

  // Estado para el oponente (simulado)
  const [opponentStatus, setOpponentStatus] = useState<NftStatus>({
    tokenId: 0,
    name: "Oponente Legendario",
    imageUrl: LEVEL_IMAGES[1],
    score: 5,
    level: 1,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlayerStatus = (userForFetch: any) => {
    if (userForFetch?.fid && campaignId > 0) {
      setIsLoading(true);
      setError(null);
      fetch(`/api/gamification/status?fid=${userForFetch.fid}&campaignId=${campaignId}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setError(data.error);
            setPlayerStatus(null);
          } else {
            setPlayerStatus(data);
          }
        })
        .catch(() => setError("No se pudo conectar con el servidor."))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
      setError("Faltan datos (usuario o campaña) para iniciar el duelo.");
    }
  };

  useEffect(() => {
    if (isUserLoading) return; // Espera al hook principal

    let userForFetch = user;
    if (process.env.NODE_ENV === "development" && !user) {
      userForFetch = { fid: 20039 } as any;
    }
    fetchPlayerStatus(userForFetch);
  }, [user, campaignId, isUserLoading]);

  // --- Lógica de Simulación para la Demo ---
  const handleSimulateLike = (player: "player" | "opponent") => {
    if (player === "player" && playerStatus) {
      const newScore = playerStatus.score + 1;
      const currentLevel = playerStatus.level;
      setPlayerStatus({ ...playerStatus, score: newScore });

      if (newScore === 10 && currentLevel === 1) handleEvolveDemo(playerStatus.tokenId);
      if (newScore === 20 && currentLevel === 2) handleEvolveDemo(playerStatus.tokenId);
    } else if (player === "opponent") {
      const newScore = opponentStatus.score + 1;
      let newLevel = opponentStatus.level;
      let newImageUrl = opponentStatus.imageUrl;

      // 2. Añadimos la lógica de evolución para el oponente
      if (newScore === 8 && opponentStatus.level === 1) {
        newLevel = 2;
        newImageUrl = LEVEL_IMAGES[2];
      }
      if (newScore === 15 && opponentStatus.level === 2) {
        newLevel = 3;
        newImageUrl = LEVEL_IMAGES[3];
      }
      setOpponentStatus({ ...opponentStatus, score: newScore, level: newLevel, imageUrl: newImageUrl });
    }
  };

  const handleEvolveDemo = async (tokenId: number) => {
    const toastId = toast.loading("¡Evolucionando NFT!");
    try {
      await fetch("/api/test/evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId: tokenId,
          secret: process.env.TEST_MINT_SECRET,
        }),
      });
      toast.dismiss(toastId);
      toast.success("¡Tu NFT ha subido de Nivel!");
      setTimeout(fetchPlayerStatus, 1500); // Esperamos a la blockchain y refrescamos
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Falló la evolución de prueba.");
      console.error(err);
    }
  };

  if (isLoading)
    return (
      <div className="text-center p-8">
        <span className="loading loading-spinner"></span>
      </div>
    );

  if (error) return <div className="text-center p-8 text-error">{error}</div>;

  if (!playerStatus)
    return (
      <div className="text-center p-8 text-white">
        No estás participando en esta campaña. ¡Registra tu &apos;cast&apos; para competir!
      </div>
    );

  const userToDisplay = user || (process.env.NODE_ENV === "development" ? { username: "edsphinx.eth (dev)" } : null);

  return (
    <div className="flex flex-col items-center min-h-screen p-4 text-white text-center">
      <h1 className="text-3xl font-bold mb-2">Duelo de Influencia</h1>

      <div className="w-full grid grid-cols-2 gap-4 items-start">
        <DuelistCard
          name={`@${userToDisplay?.username}`}
          imageUrl={playerStatus.imageUrl}
          score={playerStatus.score}
          level={playerStatus.level}
          onAddLike={() => handleSimulateLike("player")}
          isPlayer={true}
        />

        <DuelistCard
          name={opponentStatus.name}
          imageUrl={opponentStatus.imageUrl}
          score={opponentStatus.score}
          level={opponentStatus.level}
          onAddLike={() => handleSimulateLike("opponent")}
          isPlayer={false}
        />
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <FireIcon className="h-16 w-16 text-red-500 animate-pulse" />
        <p className="font-black text-4xl text-white -mt-4">VS</p>
      </div>
    </div>
  );
}
