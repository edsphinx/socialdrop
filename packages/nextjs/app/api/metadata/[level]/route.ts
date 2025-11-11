import { NextResponse } from "next/server";

// Define aquí los CIDs de las imágenes que subiste a Pinata
const levelImages: { [key: number]: string } = {
  1: "ipfs://bafybeiakfsnmcuqenkwsbhtpi4mh5dq62aho3g2svww5hfw5b4lodgfh3m",
  2: "ipfs://bafybeic3rbxwu4tnhiozdpaorom4fk5aj2ue3utwgbxcfnyqtweoy2e4d4",
  3: "ipfs://bafybeicqqoskrn2t46kztiz3utes3rrbrlbgkflmafzy5nfjxcs3a2fnbm",
  4: "ipfs://bafybeihj4kvd47itz6dzt5zh4o4ze72f3ybn3fhaadlwwjxh4r4utactmy",
};

// Descripciones dinámicas por nivel
const levelDescriptions: { [key: number]: string } = {
  1: "Un NFT exclusivo de SocialDrop en su forma inicial. ¡Comienza tu viaje como influencer y acumula likes para evolucionar!",
  2: "Has alcanzado el Nivel 2! Tu NFT ha evolucionado demostrando tu creciente influencia en la comunidad. Sigue adelante para alcanzar nuevas alturas.",
  3: "¡Nivel 3 desbloqueado! Eres un verdadero influencer de SocialDrop. Tu impacto en la comunidad es innegable. ¿Puedes llegar al nivel máximo?",
  4: "¡NIVEL MÁXIMO ALCANZADO! Has demostrado ser un maestro de la influencia. Este NFT es un símbolo de tu dedicación y poder en SocialDrop.",
};

// Rareza por nivel
const levelRarity: { [key: number]: string } = {
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Legendary",
};

// Stats de poder por nivel (pueden ser usados en gamification futura)
const levelStats: { [key: number]: { influence: number; power: number; prestige: number } } = {
  1: { influence: 10, power: 5, prestige: 1 },
  2: { influence: 25, power: 15, prestige: 10 },
  3: { influence: 50, power: 35, prestige: 50 },
  4: { influence: 100, power: 75, prestige: 100 },
};

interface RouteContext {
  params: Promise<{
    level: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const level = parseInt(params.level, 10);

  if (isNaN(level) || !levelImages[level]) {
    return NextResponse.json({ error: "Nivel inválido o no encontrado" }, { status: 404 });
  }

  const imageUrl = levelImages[level];
  const description = levelDescriptions[level] || levelDescriptions[1];
  const rarity = levelRarity[level] || "Common";
  const stats = levelStats[level] || levelStats[1];

  // Construimos el objeto de metadatos estándar de ERC721 con OpenSea extensions
  const metadata = {
    name: `SocialDrop NFT - Level ${level}`,
    description: description,
    image: imageUrl,
    external_url: `https://socialdrop.live/nft/${level}`,
    attributes: [
      // Nivel principal
      {
        trait_type: "Level",
        value: level,
        display_type: "number",
      },
      // Rareza
      {
        trait_type: "Rarity",
        value: rarity,
      },
      // Stats de influencia
      {
        trait_type: "Influence Power",
        value: stats.influence,
        display_type: "boost_number",
      },
      {
        trait_type: "Social Power",
        value: stats.power,
        display_type: "boost_number",
      },
      {
        trait_type: "Prestige",
        value: stats.prestige,
        display_type: "boost_percentage",
      },
      // Metadata adicional
      {
        trait_type: "Platform",
        value: "SocialDrop",
      },
      {
        trait_type: "Network",
        value: "Base",
      },
      {
        trait_type: "Evolution Status",
        value: level === 4 ? "Max Level" : "Can Evolve",
      },
      // Milestone alcanzado (basado en thresholds reales)
      {
        trait_type: "Likes Milestone",
        value: level === 1 ? "0-9" : level === 2 ? "10-49" : level === 3 ? "50-99" : "100+",
      },
    ],
    // OpenSea metadata extensions
    background_color: level === 4 ? "FFD700" : level === 3 ? "C0C0C0" : level === 2 ? "CD7F32" : "808080",
    animation_url: undefined, // Puedes agregar animaciones aquí en el futuro
    youtube_url: undefined,
    // Properties adicionales para OpenSea
    properties: {
      level: {
        name: "Level",
        value: level,
        type: "number",
      },
      rarity: {
        name: "Rarity",
        value: rarity,
        type: "string",
      },
      evolutionStage: {
        name: "Evolution Stage",
        value: `${level} of 4`,
        type: "string",
      },
    },
  };

  return NextResponse.json(metadata, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Content-Type": "application/json",
    },
  });
}
