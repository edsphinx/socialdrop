import { NextResponse } from "next/server";

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
    return NextResponse.json({ error: "Invalid or unknown level" }, { status: 404 });
  }

  const imageUrl = levelImages[level];

  const metadata = {
    name: `SocialDrop NFT - Level ${level}`,
    description: "An exclusive SocialDrop NFT that evolves with your influence.",
    image: imageUrl,
    attributes: [
      {
        trait_type: "Level",
        value: level,
      },
    ],
  };

  return NextResponse.json(metadata);
}
