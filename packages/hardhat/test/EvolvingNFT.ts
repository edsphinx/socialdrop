import { expect } from "chai";
import { ethers } from "hardhat";
import { EvolvingNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("EvolvingNFT", function () {
  let evolvingNFT: EvolvingNFT;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const NAME = "Evolving NFT";
  const SYMBOL = "EVOLVE";
  const BASE_URI = "https://socialdrop.live/api/metadata/";

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("EvolvingNFT");
    evolvingNFT = (await factory.deploy(NAME, SYMBOL, BASE_URI)) as EvolvingNFT;
    await evolvingNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("should set the correct name and symbol", async function () {
      expect(await evolvingNFT.name()).to.equal(NAME);
      expect(await evolvingNFT.symbol()).to.equal(SYMBOL);
    });

    it("should set the deployer as owner", async function () {
      expect(await evolvingNFT.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("should mint an NFT to the correct address", async function () {
      await evolvingNFT.mint(user1.address);
      expect(await evolvingNFT.ownerOf(0)).to.equal(user1.address);
    });

    it("should start at level 1", async function () {
      await evolvingNFT.mint(user1.address);
      expect(await evolvingNFT.tokenEvolutionLevel(0)).to.equal(1);
    });

    it("should increment token IDs", async function () {
      await evolvingNFT.mint(user1.address);
      await evolvingNFT.mint(user2.address);
      expect(await evolvingNFT.ownerOf(0)).to.equal(user1.address);
      expect(await evolvingNFT.ownerOf(1)).to.equal(user2.address);
    });

    it("should return the minted token ID", async function () {
      const tx = await evolvingNFT.mint(user1.address);
      const receipt = await tx.wait();
      const transferEvent = receipt?.logs.find(log => {
        try {
          return evolvingNFT.interface.parseLog({ data: log.data, topics: [...log.topics] })?.name === "Transfer";
        } catch {
          return false;
        }
      });
      expect(transferEvent).to.not.equal(undefined);
    });

    it("should only allow the owner to mint", async function () {
      await expect(evolvingNFT.connect(user1).mint(user1.address)).to.be.revertedWithCustomError(
        evolvingNFT,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("Evolution", function () {
    beforeEach(async () => {
      await evolvingNFT.mint(user1.address);
    });

    it("should increment the level by 1", async function () {
      await evolvingNFT.evolve(0);
      expect(await evolvingNFT.tokenEvolutionLevel(0)).to.equal(2);
    });

    it("should emit NFT_Evolved event", async function () {
      await expect(evolvingNFT.evolve(0)).to.emit(evolvingNFT, "NFT_Evolved").withArgs(0, 2);
    });

    it("should allow multiple evolutions", async function () {
      await evolvingNFT.evolve(0);
      await evolvingNFT.evolve(0);
      expect(await evolvingNFT.tokenEvolutionLevel(0)).to.equal(3);
    });

    it("should only allow the owner to evolve", async function () {
      await expect(evolvingNFT.connect(user1).evolve(0)).to.be.revertedWithCustomError(
        evolvingNFT,
        "OwnableUnauthorizedAccount",
      );
    });

    it("should revert for non-existent tokens", async function () {
      await expect(evolvingNFT.evolve(999)).to.be.revertedWithCustomError(evolvingNFT, "TokenDoesNotExist");
    });
  });

  describe("Token URI", function () {
    beforeEach(async () => {
      await evolvingNFT.mint(user1.address);
    });

    it("should return the correct URI for level 1", async function () {
      expect(await evolvingNFT.tokenURI(0)).to.equal(`${BASE_URI}1.json`);
    });

    it("should update URI after evolution", async function () {
      await evolvingNFT.evolve(0);
      expect(await evolvingNFT.tokenURI(0)).to.equal(`${BASE_URI}2.json`);
    });

    it("should revert for non-existent tokens", async function () {
      await expect(evolvingNFT.tokenURI(999)).to.be.revertedWithCustomError(evolvingNFT, "TokenDoesNotExist");
    });
  });

  describe("setBaseURI", function () {
    it("should update the base URI", async function () {
      await evolvingNFT.mint(user1.address);
      const newBaseURI = "https://new-api.com/metadata/";
      await evolvingNFT.setBaseURI(newBaseURI);
      expect(await evolvingNFT.tokenURI(0)).to.equal(`${newBaseURI}1.json`);
    });

    it("should only allow the owner to set base URI", async function () {
      await expect(evolvingNFT.connect(user1).setBaseURI("https://evil.com/")).to.be.revertedWithCustomError(
        evolvingNFT,
        "OwnableUnauthorizedAccount",
      );
    });
  });
});
