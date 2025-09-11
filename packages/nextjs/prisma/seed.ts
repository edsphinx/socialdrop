import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Borrando datos antiguos...");
  // Borramos en orden inverso para evitar problemas de claves foráneas
  await prisma.gamification_scores.deleteMany({});
  await prisma.nfts_minted.deleteMany({});
  await prisma.campaigns.deleteMany({});
  console.log("Datos antiguos borrados.");

  console.log("Creando campañas de prueba...");
  const campaign1 = await prisma.campaigns.create({
    data: {
      name: "Campaña de Lanzamiento Alpha",
      target_cast_hash: "0x1111111111111111111111111111111111111111",
      max_mints: 100,
      is_active: true,
      creator_fid: 20039,
      nft_image_url_level_1: "ipfs://bafybeiakfsnmcuqenkwsbhtpi4mh5dq62aho3g2svww5hfw5b4lodgfh3m", // Nivel 1
      nft_image_url_level_2: "ipfs://bafybeic3rbxwu4tnhiozdpaorom4fk5aj2ue3utwgbxcfnyqtweoy2e4d4", // Nivel 2
      nft_image_url_level_3: "ipfs://bafybeicqqoskrn2t46kztiz3utes3rrbrlbgkflmafzy5nfjxcs3a2fnbm", // Nivel 3
    },
  });

  const campaign2 = await prisma.campaigns.create({
    data: {
      name: "Colaboración Comunidad Base",
      target_cast_hash: "0x2222222222222222222222222222222222222222",
      max_mints: 500,
      is_active: true,
      creator_fid: 1327413,
      nft_image_url_level_1: "ipfs://bafybeihj4kvd47itz6dzt5zh4o4ze72f3ybn3fhaadlwwjxh4r4utactmy", // Nivel 1
    },
  });

  const campaign3 = await prisma.campaigns.create({
    data: {
      name: "Campaña Pasada (Finalizada)",
      target_cast_hash: "0x3333333333333333333333333333333333333333",
      max_mints: 50,
      is_active: false, // Campaña inactiva
      creator_fid: 20039,
      nft_image_url_level_1: "ipfs://bafybeiakfsnmcuqenkwsbhtpi4mh5dq62aho3g2svww5hfw5b4lodgfh3m",
    },
  });

  console.log("Campañas creadas.");

  console.log("Creando NFTs minteados de prueba...");
  await prisma.nfts_minted.createMany({
    data: [
      { campaign_id: campaign1.id, token_id: 1, recipient_address: "0xAddress1", user_fid: 1, level: 2 },
      { campaign_id: campaign1.id, token_id: 2, recipient_address: "0xAddress2", user_fid: 2, level: 1 },
      { campaign_id: campaign2.id, token_id: 3, recipient_address: "0xAddress3", user_fid: 3, level: 1 },
      { campaign_id: campaign1.id, token_id: 3, recipient_address: "0xAddress3", user_fid: 4, level: 1 },
    ],
  });
  console.log("NFTs minteados creados.");

  console.log("Creando duelos/puntajes de prueba...");
  await prisma.gamification_scores.createMany({
    data: [
      {
        campaign_id: campaign1.id,
        nft_holder_address: "0xAddress1",
        nft_holder_fid: 1,
        score: 55,
        tracked_cast_hash: "0xduel1",
      },
      {
        campaign_id: campaign1.id,
        nft_holder_address: "0xAddress2",
        nft_holder_fid: 2,
        score: 32,
        tracked_cast_hash: "0xduel2",
      },
      {
        campaign_id: campaign2.id,
        nft_holder_address: "0xAddress3",
        nft_holder_fid: 3,
        score: 10,
        tracked_cast_hash: "0xduel3",
      },
      {
        campaign_id: campaign3.id,
        nft_holder_address: "0xAddress3",
        nft_holder_fid: 4,
        score: 10,
        tracked_cast_hash: "0xduel3",
      },
    ],
  });
  console.log("Duelos/puntajes creados.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
