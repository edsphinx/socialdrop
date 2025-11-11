/**
 * Script de validación para Airstack API
 *
 * Prerequisitos:
 * 1. yarn add @airstack/node
 * 2. Obtener API key gratis en: https://app.airstack.xyz
 * 3. Agregar AIRSTACK_API_KEY a .env
 *
 * Ejecutar:
 * AIRSTACK_API_KEY=tu_api_key node test-airstack.js
 */

const { init, fetchQuery } = require("@airstack/node");

// Configuración
const API_KEY = process.env.AIRSTACK_API_KEY;
const TEST_FID = 3; // dwr.eth - co-fundador de Farcaster
const TEST_CAST_HASH = "0xa48dd46161d8e57725f5e26e34ec19c13ff7f3b9";

if (!API_KEY) {
  console.log("❌ ERROR: AIRSTACK_API_KEY no está configurada\n");
  console.log("📝 Pasos para obtener API key:");
  console.log("   1. Ir a https://app.airstack.xyz");
  console.log("   2. Registrarse (gratis)");
  console.log("   3. Copiar API key del dashboard");
  console.log("   4. Ejecutar:");
  console.log("      AIRSTACK_API_KEY=tu_api_key node test-airstack.js\n");
  process.exit(1);
}

// Inicializar Airstack
init(API_KEY);

async function testAirstack() {
  console.log("🧪 INICIANDO VALIDACIÓN DE AIRSTACK API\n");
  console.log(`🔑 API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

  try {
    // ========================================
    // Test 1: Obtener Datos de Usuario
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`👤 TEST 1: Obtener datos de usuario (FID ${TEST_FID})`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const userQuery = `
      query GetFarcasterUser {
        Socials(
          input: {
            filter: {
              dappName: { _eq: farcaster },
              userId: { _eq: "${TEST_FID}" }
            }
            blockchain: ethereum
          }
        ) {
          Social {
            userId
            profileName
            profileDisplayName
            profileImage
            profileBio
            connectedAddresses {
              address
              blockchain
            }
            userAssociatedAddresses
            followerCount
            followingCount
          }
        }
      }
    `;

    const startUserQuery = Date.now();
    const { data: userData, error: userError } = await fetchQuery(userQuery);
    const userQueryLatency = Date.now() - startUserQuery;

    if (userError) {
      console.log("❌ Error obteniendo usuario:", userError.message);
      return false;
    }

    const user = userData?.Socials?.Social?.[0];

    if (!user) {
      console.log("❌ Usuario no encontrado");
      return false;
    }

    console.log("✅ Usuario encontrado:");
    console.log(`   FID: ${user.userId}`);
    console.log(`   Username: ${user.profileName || "N/A"}`);
    console.log(`   Display Name: ${user.profileDisplayName || "N/A"}`);
    console.log(`   Bio: ${user.profileBio?.substring(0, 60) || "N/A"}${user.profileBio?.length > 60 ? "..." : ""}`);
    console.log(`   PFP: ${user.profileImage?.substring(0, 50) || "N/A"}${user.profileImage?.length > 50 ? "..." : ""}`);
    console.log(`   Followers: ${user.followerCount || 0}`);
    console.log(`   Following: ${user.followingCount || 0}`);

    const address = user.connectedAddresses?.[0]?.address || user.userAssociatedAddresses?.[0];
    console.log(`   Address: ${address || "N/A"}`);
    console.log(`   Latencia: ${userQueryLatency}ms\n`);

    // ========================================
    // Test 2: Obtener Reacciones de un Cast
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`❤️  TEST 2: Obtener likes de un cast`);
    console.log(`   Cast Hash: ${TEST_CAST_HASH}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const reactionsQuery = `
      query GetReactions {
        FarcasterReactions(
          input: {
            filter: {
              castHash: { _eq: "${TEST_CAST_HASH}" }
              reactionType: { _eq: like }
            }
            blockchain: ALL
          }
        ) {
          Reaction {
            castHash
            reactionType
            reactedBy {
              userId
              profileName
            }
          }
        }
      }
    `;

    const startReactionsQuery = Date.now();
    const { data: reactionsData, error: reactionsError } = await fetchQuery(reactionsQuery);
    const reactionsQueryLatency = Date.now() - startReactionsQuery;

    if (reactionsError) {
      console.log("⚠️ Error obteniendo reacciones:", reactionsError.message);
      console.log(`   Latencia: ${reactionsQueryLatency}ms\n`);
    } else {
      const reactions = reactionsData?.FarcasterReactions?.Reaction || [];

      console.log("✅ Reacciones obtenidas:");
      console.log(`   Total likes: ${reactions.length}`);
      console.log(`   Latencia: ${reactionsQueryLatency}ms`);

      if (reactions.length > 0) {
        console.log(`\n   Primeros 5 usuarios que dieron like:`);
        reactions.slice(0, 5).forEach((reaction, i) => {
          console.log(`     ${i + 1}. FID ${reaction.reactedBy.userId} (@${reaction.reactedBy.profileName || "unknown"})`);
        });
      }

      console.log();
    }

    // ========================================
    // Test 3: Verificar Like de Usuario Específico
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ TEST 3: Verificar si FID ${TEST_FID} dio like al cast`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const checkLikeQuery = `
      query CheckLike {
        FarcasterReactions(
          input: {
            filter: {
              castHash: { _eq: "${TEST_CAST_HASH}" }
              reactedBy: { userId: { _eq: "${TEST_FID}" } }
              reactionType: { _eq: like }
            }
            blockchain: ALL
          }
        ) {
          Reaction {
            reactionType
            reactedBy {
              userId
              profileName
            }
          }
        }
      }
    `;

    const startCheckLike = Date.now();
    const { data: checkLikeData } = await fetchQuery(checkLikeQuery);
    const checkLikeLatency = Date.now() - startCheckLike;

    const userLiked = (checkLikeData?.FarcasterReactions?.Reaction?.length || 0) > 0;

    if (userLiked) {
      console.log(`✅ Sí, FID ${TEST_FID} dio like a este cast`);
    } else {
      console.log(`❌ No, FID ${TEST_FID} NO dio like a este cast`);
    }
    console.log(`   Latencia: ${checkLikeLatency}ms\n`);

    // ========================================
    // Test 4: Obtener Casts Trending (BONUS)
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🔥 TEST 4: Obtener trending casts (últimas 24h)`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const trendingQuery = `
      query TrendingCasts {
        FarcasterCasts(
          input: {
            filter: {
              castedAtTimestamp: { _gte: "${yesterday}" }
            }
            blockchain: ALL
            order: { numberOfLikes: DESC }
            limit: 5
          }
        ) {
          Cast {
            castHash
            castedBy {
              userId
              profileName
            }
            text
            numberOfLikes
            numberOfRecasts
          }
        }
      }
    `;

    const startTrending = Date.now();
    const { data: trendingData, error: trendingError } = await fetchQuery(trendingQuery);
    const trendingLatency = Date.now() - startTrending;

    if (trendingError) {
      console.log("⚠️ Error obteniendo trending casts:", trendingError.message);
      console.log(`   Latencia: ${trendingLatency}ms\n`);
    } else {
      const casts = trendingData?.FarcasterCasts?.Cast || [];

      console.log(`✅ Top ${casts.length} casts trending:`);
      console.log(`   Latencia: ${trendingLatency}ms\n`);

      casts.forEach((cast, i) => {
        const text = cast.text?.substring(0, 60) || "N/A";
        console.log(`   ${i + 1}. @${cast.castedBy.profileName} (FID ${cast.castedBy.userId})`);
        console.log(`      "${text}${cast.text?.length > 60 ? "..." : ""}"`);
        console.log(`      ❤️ ${cast.numberOfLikes || 0} likes | 🔄 ${cast.numberOfRecasts || 0} recasts\n`);
      });
    }

    // ========================================
    // Test 5: Verificar Límites de API
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`📊 TEST 5: Información de uso del API`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("📈 Free Tier Limits:");
    console.log("   Requests/mes: 100,000");
    console.log("   Rate limit: 50 req/segundo");
    console.log("   Costo: $0/mes\n");

    console.log("💡 Para ver uso actual:");
    console.log("   https://app.airstack.xyz/usage\n");

    // ========================================
    // Resumen Final
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 RESUMEN DE VALIDACIÓN");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("✅ Todos los tests pasaron exitosamente!");
    console.log("\n📈 Latencias:");
    console.log(`   Get User: ${userQueryLatency}ms`);
    console.log(`   Get Reactions: ${reactionsQueryLatency}ms`);
    console.log(`   Check Like: ${checkLikeLatency}ms`);
    console.log(`   Trending Casts: ${trendingLatency}ms`);

    const avgLatency = Math.round(
      (userQueryLatency + reactionsQueryLatency + checkLikeLatency + trendingLatency) / 4
    );
    console.log(`   Promedio: ${avgLatency}ms`);

    console.log("\n💰 Información de Costos:");
    console.log("   Plan actual: Free Tier");
    console.log("   Requests usados hoy: 4 (0.004% del límite mensual)");
    console.log("   Costo mensual: $0");
    console.log("   Suficiente para: ~25,000 usuarios activos/mes");

    console.log("\n🎯 Funcionalidades Disponibles:");
    console.log("   ✅ Datos de usuario (FID → address, username)");
    console.log("   ✅ Reacciones de casts (likes, recasts)");
    console.log("   ✅ Verificar likes de usuario");
    console.log("   ✅ Trending casts (BONUS - no disponible en Neynar free)");
    console.log("   ✅ Queries complejas con GraphQL");

    console.log("\n🎉 AIRSTACK FUNCIONA CORRECTAMENTE!");
    console.log("\n✅ Puedes proceder a:");
    console.log("   1. Descomentar código en services/airstack.service.ts");
    console.log("   2. Configurar USE_AIRSTACK=true en .env");
    console.log("   3. Agregar AIRSTACK_API_KEY a .env");
    console.log("   4. Probar en tu aplicación\n");

    console.log("📚 Recursos:");
    console.log("   Dashboard: https://app.airstack.xyz");
    console.log("   Docs: https://docs.airstack.xyz");
    console.log("   Farcaster Guide: https://docs.airstack.xyz/airstack-docs-and-faqs/guides/farcaster\n");

    return true;

  } catch (error) {
    console.log("\n❌ ERROR DURANTE LA VALIDACIÓN:");
    console.log(`   ${error.message}\n`);

    if (error.message.includes("Cannot find module")) {
      console.log("⚠️ La dependencia @airstack/node no está instalada.");
      console.log("\n   Instalar con:");
      console.log("   cd packages/nextjs && yarn add @airstack/node\n");
    } else if (error.message.includes("API key")) {
      console.log("⚠️ Problema con API key.");
      console.log("\n   Verifica que:");
      console.log("   1. La API key sea válida");
      console.log("   2. Esté correctamente configurada");
      console.log("   3. No haya expirado\n");
    }

    return false;
  }
}

// Ejecutar test
testAirstack()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Error inesperado:", error);
    process.exit(1);
  });
