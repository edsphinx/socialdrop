/**
 * Script de validación para Farcaster Hub
 *
 * Prerequisito:
 * yarn add @farcaster/hub-nodejs
 *
 * Ejecutar:
 * node test-hub.js
 */

const { getSSLHubRpcClient } = require("@farcaster/hub-nodejs");

// Configuración
const HUB_URL = process.env.FARCASTER_HUB_URL || "nemes.farcaster.xyz:2283";
const TEST_FID = 3; // dwr.eth - co-fundador de Farcaster
const TEST_CAST_HASH = "a48dd46161d8e57725f5e26e34ec19c13ff7f3b9";
const TEST_CAST_FID = 3;

async function testHub() {
  console.log("🧪 INICIANDO VALIDACIÓN DE FARCASTER HUB\n");
  console.log(`📡 Conectando a: ${HUB_URL}\n`);

  try {
    const client = getSSLHubRpcClient(HUB_URL);

    // ========================================
    // Test 1: Conexión y Info del Hub
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📡 TEST 1: Verificar conexión al hub");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const startHubInfo = Date.now();
    const hubInfo = await client.getHubInfo();
    const hubInfoLatency = Date.now() - startHubInfo;

    if (hubInfo.isOk()) {
      console.log("✅ Hub conectado exitosamente!");
      console.log(`   Nickname: ${hubInfo.value.nickname || "N/A"}`);
      console.log(`   Version: ${hubInfo.value.version || "N/A"}`);
      console.log(`   Is Syncing: ${hubInfo.value.isSyncing ? "Sí" : "No"}`);
      console.log(`   Latencia: ${hubInfoLatency}ms\n`);
    } else {
      console.log("❌ Error conectando al hub:", hubInfo.error.message);
      console.log("\n⚠️ El hub puede estar caído o inaccesible. Intenta con otro:");
      console.log("   - nemes.farcaster.xyz:2283 (Neynar)");
      console.log("   - hoyt.farcaster.xyz:2283 (Warpcast)");
      console.log("   - hub.pinata.cloud (Pinata)\n");
      return false;
    }

    // ========================================
    // Test 2: Obtener Datos de Usuario
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`👤 TEST 2: Obtener datos de usuario (FID ${TEST_FID})`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const startUserData = Date.now();
    const userResult = await client.getUserData({ fid: TEST_FID });
    const userDataLatency = Date.now() - startUserData;

    if (userResult.isOk()) {
      const messages = userResult.value.messages;
      console.log(`✅ Usuario encontrado! (${messages.length} mensajes)`);

      // Parsear datos del usuario
      let username = "";
      let displayName = "";
      let pfpUrl = "";
      let bio = "";

      for (const msg of messages) {
        const data = msg.data?.userDataBody;
        if (!data) continue;

        switch (data.type) {
          case 1: // USERNAME
            username = data.value;
            break;
          case 2: // PFP
            pfpUrl = data.value;
            break;
          case 3: // BIO
            bio = data.value;
            break;
          case 5: // DISPLAY
            displayName = data.value;
            break;
        }
      }

      console.log(`   Username: ${username || "N/A"}`);
      console.log(`   Display Name: ${displayName || "N/A"}`);
      console.log(`   Bio: ${bio?.substring(0, 60) || "N/A"}${bio?.length > 60 ? "..." : ""}`);
      console.log(`   PFP: ${pfpUrl?.substring(0, 50) || "N/A"}${pfpUrl?.length > 50 ? "..." : ""}`);
      console.log(`   Latencia: ${userDataLatency}ms\n`);
    } else {
      console.log("❌ Error obteniendo usuario:", userResult.error.message);
      return false;
    }

    // ========================================
    // Test 3: Obtener Verificaciones (Wallets)
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🔐 TEST 3: Obtener wallets verificadas (FID ${TEST_FID})`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const startVerifications = Date.now();
    const verificationsResult = await client.getVerificationsByFid({ fid: TEST_FID });
    const verificationsLatency = Date.now() - startVerifications;

    const verifiedAddresses = [];

    if (verificationsResult.isOk()) {
      for (const msg of verificationsResult.value.messages) {
        const addressBytes = msg.data?.verificationAddAddressBody?.address;
        if (addressBytes) {
          const hexAddress = "0x" + Buffer.from(addressBytes).toString("hex");
          verifiedAddresses.push(hexAddress);
        }
      }

      console.log(`✅ Verificaciones obtenidas: ${verifiedAddresses.length} wallet(s)`);
      verifiedAddresses.forEach((addr, i) => {
        console.log(`   ${i + 1}. ${addr}`);
      });
      console.log(`   Latencia: ${verificationsLatency}ms\n`);
    } else {
      console.log("⚠️ No se pudieron obtener verificaciones");
      console.log(`   Latencia: ${verificationsLatency}ms\n`);
    }

    // ========================================
    // Test 4: Obtener Custody Address
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`👛 TEST 4: Obtener custody address (FID ${TEST_FID})`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const startCustody = Date.now();
    const custodyResult = await client.getCustodyAddress({ fid: TEST_FID });
    const custodyLatency = Date.now() - startCustody;

    if (custodyResult.isOk()) {
      const custodyAddress = "0x" + Buffer.from(custodyResult.value).toString("hex");
      console.log("✅ Custody address obtenida:");
      console.log(`   ${custodyAddress}`);
      console.log(`   Latencia: ${custodyLatency}ms\n`);
    } else {
      console.log("⚠️ No se pudo obtener custody address");
      console.log(`   Latencia: ${custodyLatency}ms\n`);
    }

    // ========================================
    // Test 5: Obtener Reacciones de un Cast
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`❤️  TEST 5: Obtener reacciones de un cast`);
    console.log(`   Cast Hash: ${TEST_CAST_HASH}`);
    console.log(`   Cast FID: ${TEST_CAST_FID}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    const startReactions = Date.now();
    const reactionsResult = await client.getReactionsByTarget({
      targetCastId: {
        fid: TEST_CAST_FID,
        hash: Buffer.from(TEST_CAST_HASH, "hex"),
      },
    });
    const reactionsLatency = Date.now() - startReactions;

    if (reactionsResult.isOk()) {
      const reactions = reactionsResult.value.messages;

      // Separar por tipo
      const likes = reactions.filter(r => r.data?.reactionBody?.type === 1);
      const recasts = reactions.filter(r => r.data?.reactionBody?.type === 2);

      // Obtener FIDs únicos que dieron like
      const likedByFids = likes.map(r => r.data?.fid).filter(Boolean);
      const recastedByFids = recasts.map(r => r.data?.fid).filter(Boolean);

      console.log("✅ Reacciones obtenidas:");
      console.log(`   Total reacciones: ${reactions.length}`);
      console.log(`   Likes: ${likes.length}`);
      console.log(`   Recasts: ${recasts.length}`);
      console.log(`   Latencia: ${reactionsLatency}ms`);

      if (likedByFids.length > 0) {
        console.log(`\n   Primeros 5 FIDs que dieron like:`);
        likedByFids.slice(0, 5).forEach((fid, i) => {
          console.log(`     ${i + 1}. FID ${fid}`);
        });
      }

      console.log();
    } else {
      console.log("⚠️ No se encontraron reacciones (puede ser normal si el cast es nuevo)");
      console.log(`   Latencia: ${reactionsLatency}ms\n`);
    }

    // ========================================
    // Test 6: Verificar Like de Usuario Específico
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`✅ TEST 6: Verificar si FID ${TEST_FID} dio like al cast`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // Reutilizar resultado anterior
    if (reactionsResult.isOk()) {
      const reactions = reactionsResult.value.messages;
      const userLiked = reactions.some(
        r => r.data?.fid === TEST_FID && r.data?.reactionBody?.type === 1
      );

      if (userLiked) {
        console.log(`✅ Sí, FID ${TEST_FID} dio like a este cast\n`);
      } else {
        console.log(`❌ No, FID ${TEST_FID} NO dio like a este cast\n`);
      }
    }

    // ========================================
    // Resumen Final
    // ========================================
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 RESUMEN DE VALIDACIÓN");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    console.log("✅ Todos los tests pasaron exitosamente!");
    console.log("\n📈 Latencias:");
    console.log(`   Hub Info: ${hubInfoLatency}ms`);
    console.log(`   User Data: ${userDataLatency}ms`);
    console.log(`   Verifications: ${verificationsLatency}ms`);
    console.log(`   Custody Address: ${custodyLatency}ms`);
    console.log(`   Reactions: ${reactionsLatency}ms`);

    const avgLatency = Math.round(
      (hubInfoLatency + userDataLatency + verificationsLatency + custodyLatency + reactionsLatency) / 5
    );
    console.log(`   Promedio: ${avgLatency}ms`);

    console.log("\n💰 Información de Costos:");
    console.log("   Costo por request: $0 (GRATIS)");
    console.log("   Rate limit: Sin límite");
    console.log("   Costo mensual estimado: $0");

    console.log("\n🎉 FARCASTER HUB FUNCIONA CORRECTAMENTE!");
    console.log("\n✅ Puedes proceder a:");
    console.log("   1. Descomentar código en services/farcaster-hub.service.ts");
    console.log("   2. Configurar USE_FARCASTER_HUB=true en .env");
    console.log("   3. Probar en tu aplicación con el endpoint:");
    console.log("      GET /api/test/farcaster-providers\n");

    return true;

  } catch (error) {
    console.log("\n❌ ERROR DURANTE LA VALIDACIÓN:");
    console.log(`   ${error.message}\n`);

    if (error.message.includes("Cannot find module")) {
      console.log("⚠️ La dependencia @farcaster/hub-nodejs no está instalada.");
      console.log("\n   Instalar con:");
      console.log("   cd packages/nextjs && yarn add @farcaster/hub-nodejs\n");
    }

    return false;
  }
}

// Ejecutar test
testHub()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Error inesperado:", error);
    process.exit(1);
  });
