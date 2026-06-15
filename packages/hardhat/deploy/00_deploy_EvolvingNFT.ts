import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Deploys the "EvolvingNFT" contract.
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployEvolvingNFT: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const contractName = "EvolvingNFT";
  const name = "Evolving NFT";
  const symbol = "EVOLVE";
  const baseTokenURI = "https://socialdrop.live/api/metadata/";

  console.log(`Deploying "${contractName}" with account: ${deployer}`);

  await deploy(contractName, {
    from: deployer,
    args: [name, symbol, baseTokenURI],
    log: true,
    autoMine: true,
  });

  try {
    const EvolvingNFT = await hre.ethers.getContract<Contract>(contractName, deployer);
    console.log("Contract deployed at:", EvolvingNFT.address);
  } catch (error) {
    console.error("Error getting contract instance:", error);
  }
};
export default deployEvolvingNFT;
deployEvolvingNFT.tags = ["EvolvingNFT"];
