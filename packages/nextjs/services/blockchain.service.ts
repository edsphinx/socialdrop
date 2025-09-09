import { type Chain, createPublicClient, createWalletClient, decodeEventLog, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia, hardhat } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";

let chain: Chain;
let transport: any;

if (process.env.NODE_ENV === "production") {
  // --- PRODUCCIÓN (Vercel) ---
  chain = baseSepolia;
  if (!process.env.BASE_SEPOLIA_RPC_URL) {
    throw new Error("BASE_SEPOLIA_RPC_URL is not set in .env for production");
  }
  transport = http(process.env.BASE_SEPOLIA_RPC_URL);
  console.log("[Viem Service] Usando la red de producción: Base Sepolia");
} else {
  // --- DESARROLLO (Local) ---
  chain = hardhat;
  transport = http(); // http() sin argumentos apunta a http://127.0.0.1:8545
  console.log("[Viem Service] Usando la red de desarrollo: Hardhat Local");
}

const chainId = chain.id;
const contractData = deployedContracts[chainId as keyof typeof deployedContracts]?.EvolvingNFT;

if (!contractData) {
  throw new Error(`Contrato EvolvingNFT no encontrado en la chainId ${chainId}. Asegúrate de haberlo desplegado.`);
}

const { address: contractAddress, abi: contractABI } = contractData;

if (!process.env.DEPLOYER_PRIVATE_KEY) {
  throw new Error("DEPLOYER_PRIVATE_KEY is not set in .env");
}
const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`);

const publicClient = createPublicClient({
  chain,
  transport,
});

const walletClient = createWalletClient({
  account,
  chain,
  transport,
}).extend(publicActions);

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

export async function evolveNFT(tokenId: number): Promise<{ success: boolean; hash: `0x${string}` }> {
  try {
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "evolve",
      args: [BigInt(tokenId)], // Los uint256 se pasan como BigInt
    });

    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[Viem Service] ¡Evolución exitosa! Token ID: ${tokenId}`);
    return { success: true, hash };
  } catch (error) {
    console.error(`[Viem Service] Error evolving NFT ${tokenId}:`, error);
    return { success: false, hash: "0x" };
  }
}
