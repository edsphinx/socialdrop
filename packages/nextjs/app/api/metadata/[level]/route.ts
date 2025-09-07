import { NextResponse } from "next/server";

// Define aquí los CIDs de las imágenes que subiste a Pinata
const levelImages: { [key: number]: string } = {
  1: "ipfs://bafybeiakfsnmcuqenkwsbhtpi4mh5dq62aho3g2svww5hfw5b4lodgfh3m",
  2: "ipfs://bafybeic3rbxwu4tnhiozdpaorom4fk5aj2ue3utwgbxcfnyqtweoy2e4d4",
  3: "ipfs://bafybeicqqoskrn2t46kztiz3utes3rrbrlbgkflmafzy5nfjxcs3a2fnbm",
  4: "ipfs://bafybeihj4kvd47itz6dzt5zh4o4ze72f3ybn3fhaadlwwjxh4r4utactmy",
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

  // Construimos el objeto de metadatos estándar de ERC721
  const metadata = {
    name: `SocialDrop NFT - Nivel ${level}`,
    description: "Un NFT exclusivo de SocialDrop que evoluciona con tu influencia.",
    image: imageUrl,
    attributes: [
      {
        trait_type: "Nivel",
        value: level,
      },
      // TODO: Se van añadir más atributos aquí
    ],
  };

  return NextResponse.json(metadata);
}
