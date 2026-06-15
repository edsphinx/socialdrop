import { createPublicClient, createWalletClient, decodeEventLog, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import deployedContracts from "@/contracts/deployedContracts";

const chain = baseSepolia;
const chainId = chain.id;
const transport = http(process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org");

function getContractData() {
  const data = deployedContracts[chainId as keyof typeof deployedContracts]?.EvolvingNFT;
  if (!data) throw new Error(`EvolvingNFT contract not found on chainId ${chainId}. Make sure it has been deployed.`);
  return data;
}

let _publicClient: any = null;

let _walletClient: any = null;

function getPublicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({ chain, transport });
  }
  return _publicClient;
}

function getWalletClient() {
  if (!_walletClient) {
    if (!process.env.DEPLOYER_PRIVATE_KEY) {
      throw new Error("DEPLOYER_PRIVATE_KEY is not set in .env");
    }
    const account = privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`);
    _walletClient = createWalletClient({ account, chain, transport }).extend(publicActions);
  }
  return _walletClient;
}

/**
 * Mints a new NFT to the specified address using Viem.
 * @param recipientAddress - The address that will receive the NFT.
 * @returns An object with the operation result.
 */
export async function mintNFT(
  recipientAddress: `0x${string}`,
): Promise<{ success: boolean; tokenId: number; hash: `0x${string}` }> {
  try {
    const { address: contractAddress, abi: contractABI } = getContractData();
    const walletClient = getWalletClient();
    const publicClient = getPublicClient();

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "mint",
      args: [recipientAddress],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status === "reverted") throw new Error("Transaction was reverted.");

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

    console.log(`[Viem Service] Mint successful! Token ID: ${tokenId}`);
    return { success: true, tokenId, hash };
  } catch (error) {
    console.error("[Viem Service] Error minting NFT:", error);
    return { success: false, tokenId: -1, hash: "0x" };
  }
}

export async function evolveNFT(tokenId: number): Promise<{ success: boolean; hash: `0x${string}` }> {
  try {
    const { address: contractAddress, abi: contractABI } = getContractData();
    const walletClient = getWalletClient();
    const publicClient = getPublicClient();

    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "evolve",
      args: [BigInt(tokenId)],
    });

    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[Viem Service] Evolution successful! Token ID: ${tokenId}`);
    return { success: true, hash };
  } catch (error) {
    console.error(`[Viem Service] Error evolving NFT ${tokenId}:`, error);
    return { success: false, hash: "0x" };
  }
}

/**
 * Reads the current evolution level of an NFT from the blockchain.
 * @param tokenId The token ID to query.
 * @returns The current level of the NFT.
 */
export async function getLevelOf(tokenId: number): Promise<number> {
  try {
    const { address: contractAddress, abi: contractABI } = getContractData();
    const publicClient = getPublicClient();

    const level = await publicClient.readContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "tokenEvolutionLevel",
      args: [BigInt(tokenId)],
    });
    return Number(level);
  } catch (error) {
    console.error(`[Viem Service] Error reading level for token ${tokenId}:`, error);
    return 1;
  }
}
