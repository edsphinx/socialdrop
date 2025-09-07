import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

/**
 * Despliega el contrato "EvolvingNFT".
 *
 * @param hre HardhatRuntimeEnvironment object.
 */
const deployEvolvingNFT: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  // Define los argumentos del constructor del contrato
  const contractName = "EvolvingNFT";
  const name = "Evolving NFT";
  const symbol = "EVOLVE";
  const baseTokenURI = "https://socialdrop.live/metadata/";

  console.log(`Desplegando "${contractName}" con la cuenta: ${deployer}`);

  await deploy(contractName, {
    from: deployer,
    // Argumentos del constructor del contrato: name, symbol, baseTokenURI
    args: [name, symbol, baseTokenURI],
    log: true,
    autoMine: true,
  });

  // Nota: El siguiente bloque para interactuar con el contrato es opcional
  // y se puede omitir si solo necesitas el despliegue.
  try {
    const EvolvingNFT = await hre.ethers.getContract<Contract>(contractName, deployer);
    console.log("Contrato desplegado en:", EvolvingNFT.address);
    // console.log("Nombre del Token:", await EvolvingNFT.name());
    // console.log("Símbolo del Token:", await EvolvingNFT.symbol());
  } catch (error) {
    console.error("Error al obtener la instancia del contrato:", error);
  }
};
export default deployEvolvingNFT;
deployEvolvingNFT.tags = ["EvolvingNFT"];
