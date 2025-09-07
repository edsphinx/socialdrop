import { createPublicClient, createWalletClient, decodeEventLog, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hardhat } from "viem/chains";
// Cambiado a hardhat para pruebas locales
import deployedContracts from "~~/contracts/deployedContracts";

const chainId = hardhat.id; // Usamos el chainId de la red local

const contractData = deployedContracts[chainId]?.EvolvingNFT;

if (!contractData) {
  throw new Error(`Contrato EvolvingNFT no encontrado en la chainId ${chainId}. Asegúrate de haberlo desplegado.`);
}

const { address: contractAddress, abi: contractABI } = contractData;

// --- CORRECCIÓN APLICADA AQUÍ ---
if (!process.env.DEPLOYER_PRIVATE_KEY) {
  throw new Error("DEPLOYER_PRIVATE_KEY is not set in .env");
}
// Aseguramos el tipo correcto para Viem sin añadir un "0x" extra
const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`);
// --- FIN DE LA CORRECCIÓN ---

const publicClient = createPublicClient({
  chain: hardhat,
  transport: http(), // Para la red local de Hardhat, no se necesita RPC_URL
});

const walletClient = createWalletClient({
  account,

  chain: hardhat,
  transport: http(),
});

/**
 * Mintea un nuevo NFT a la dirección especificada usando Viem.
 * @param recipientAddress - La dirección que recibirá el NFT.
 * @returns Un objeto con el resultado de la operación.
 */
export async function mintNFT(
  recipientAddress: `0x${string}`,
): Promise<{ success: boolean; tokenId: number; hash: `0x${string}` }> {
  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "mint",
      args: [recipientAddress],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") throw new Error("La transacción fue revertida.");

    let tokenId = -1;
    for (const log of receipt.logs) {
      try {
        const decodedLog = decodeEventLog({ abi: contractABI, data: log.data, topics: log.topics });
        if (decodedLog.eventName === "Transfer") {
          tokenId = Number((decodedLog.args as { tokenId: bigint }).tokenId);
          break;
        }
      } catch (e) {
        console.error(`[Viem Service] Error decoding log: ${e}`);
      }
    }

    console.log(`[Viem Service] ¡Mint exitoso! Token ID: ${tokenId}`);
    return { success: true, tokenId, hash };
  } catch (error) {
    console.error("[Viem Service] Error minting NFT:", error);
    return { success: false, tokenId: -1, hash: "0x" };
  }
}
