import { expect } from "chai";
import { ethers } from "hardhat";
import { EvolvingNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("EvolvingNFT", function () {
  let evolvingNFT: EvolvingNFT;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const NAME = "SocialDrop NFT";
  const SYMBOL = "SDROP";
  const BASE_URI = "https://api.socialdrop.live/metadata/";

  beforeEach(async function () {
    // Get signers
    [owner, user1, user2, unauthorized] = await ethers.getSigners();

    // Deploy contract
    const EvolvingNFTFactory = await ethers.getContractFactory("EvolvingNFT");
    evolvingNFT = (await EvolvingNFTFactory.deploy(NAME, SYMBOL, BASE_URI)) as EvolvingNFT;
    await evolvingNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await evolvingNFT.name()).to.equal(NAME);
      expect(await evolvingNFT.symbol()).to.equal(SYMBOL);
    });

    it("Should set the deployer as owner", async function () {
      expect(await evolvingNFT.owner()).to.equal(owner.address);
    });

    it("Should initialize with no tokens minted", async function () {
      // Try to get tokenURI of non-existent token should revert
      await expect(evolvingNFT.tokenURI(0)).to.be.revertedWithCustomError(evolvingNFT, "TokenDoesNotExist");
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint NFT", async function () {
      const tx = await evolvingNFT.mint(user1.address);
      await tx.wait();

      // Check ownership
      expect(await evolvingNFT.ownerOf(0)).to.equal(user1.address);

      // Check balance
      expect(await evolvingNFT.balanceOf(user1.address)).to.equal(1);
    });

    it("Should start at level 1", async function () {
      await evolvingNFT.mint(user1.address);

      expect(await evolvingNFT.tokenEvolutionLevel(0)).to.equal(1);
    });

    it("Should return correct tokenURI for level 1", async function () {
      await evolvingNFT.mint(user1.address);

      const expectedURI = BASE_URI + "1.json";
      expect(await evolvingNFT.tokenURI(0)).to.equal(expectedURI);
    });

    it("Should mint multiple NFTs with sequential IDs", async function () {
      await evolvingNFT.mint(user1.address);
      await evolvingNFT.mint(user2.address);
      await evolvingNFT.mint(user1.address);

      expect(await evolvingNFT.ownerOf(0)).to.equal(user1.address);
      expect(await evolvingNFT.ownerOf(1)).to.equal(user2.address);
      expect(await evolvingNFT.ownerOf(2)).to.equal(user1.address);

      expect(await evolvingNFT.balanceOf(user1.address)).to.equal(2);
      expect(await evolvingNFT.balanceOf(user2.address)).to.equal(1);
    });

    it("Should NOT allow non-owner to mint", async function () {
      await expect(evolvingNFT.connect(unauthorized).mint(user1.address)).to.be.revertedWithCustomError(
        evolvingNFT,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should emit Transfer event on mint", async function () {
      await expect(evolvingNFT.mint(user1.address))
        .to.emit(evolvingNFT, "Transfer")
        .withArgs(ethers.ZeroAddress, user1.address, 0);
    });
  });

  describe("Evolution", function () {
    beforeEach(async function () {
      // Mint a token for user1
      await evolvingNFT.mint(user1.address);
    });

    it("Should allow owner to evolve NFT", async function () {
      const tokenId = 0;

      await evolvingNFT.evolve(tokenId);

      expect(await evolvingNFT.tokenEvolutionLevel(tokenId)).to.equal(2);
    });

    it("Should update tokenURI after evolution", async function () {
      const tokenId = 0;

      // Before evolution
      expect(await evolvingNFT.tokenURI(tokenId)).to.equal(BASE_URI + "1.json");

      // Evolve to level 2
      await evolvingNFT.evolve(tokenId);
      expect(await evolvingNFT.tokenURI(tokenId)).to.equal(BASE_URI + "2.json");

      // Evolve to level 3
      await evolvingNFT.evolve(tokenId);
      expect(await evolvingNFT.tokenURI(tokenId)).to.equal(BASE_URI + "3.json");
    });

    it("Should emit NFT_Evolved event", async function () {
      const tokenId = 0;

      await expect(evolvingNFT.evolve(tokenId)).to.emit(evolvingNFT, "NFT_Evolved").withArgs(tokenId, 2);
    });

    it("Should allow multiple evolutions", async function () {
      const tokenId = 0;

      // Evolve 5 times
      for (let i = 2; i <= 6; i++) {
        await evolvingNFT.evolve(tokenId);
        expect(await evolvingNFT.tokenEvolutionLevel(tokenId)).to.equal(i);
      }
    });

    it("Should NOT allow non-owner to evolve", async function () {
      const tokenId = 0;

      await expect(evolvingNFT.connect(unauthorized).evolve(tokenId)).to.be.revertedWithCustomError(
        evolvingNFT,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should revert when evolving non-existent token", async function () {
      const nonExistentTokenId = 999;

      await expect(evolvingNFT.evolve(nonExistentTokenId)).to.be.revertedWithCustomError(
        evolvingNFT,
        "TokenDoesNotExist",
      );
    });

    it("Should preserve ownership after evolution", async function () {
      const tokenId = 0;

      await evolvingNFT.evolve(tokenId);

      // Ownership should not change
      expect(await evolvingNFT.ownerOf(tokenId)).to.equal(user1.address);
    });
  });

  describe("TokenURI", function () {
    it("Should revert for non-existent token", async function () {
      await expect(evolvingNFT.tokenURI(999)).to.be.revertedWithCustomError(evolvingNFT, "TokenDoesNotExist");
    });

    it("Should handle different evolution levels correctly", async function () {
      await evolvingNFT.mint(user1.address);
      const tokenId = 0;

      const levels = [1, 2, 3, 4, 5, 10, 100];

      for (const targetLevel of levels) {
        // Evolve to target level
        const currentLevel = await evolvingNFT.tokenEvolutionLevel(tokenId);
        const evolutions = Number(targetLevel) - Number(currentLevel);

        for (let i = 0; i < evolutions; i++) {
          await evolvingNFT.evolve(tokenId);
        }

        const expectedURI = BASE_URI + targetLevel.toString() + ".json";
        expect(await evolvingNFT.tokenURI(tokenId)).to.equal(expectedURI);
      }
    });

    it("Should return empty string if baseURI is empty", async function () {
      // Deploy contract with empty base URI
      const EvolvingNFTFactory = await ethers.getContractFactory("EvolvingNFT");
      const nftWithEmptyURI = (await EvolvingNFTFactory.deploy(NAME, SYMBOL, "")) as EvolvingNFT;

      await nftWithEmptyURI.mint(user1.address);

      expect(await nftWithEmptyURI.tokenURI(0)).to.equal("");
    });
  });

  describe("Base URI Management", function () {
    it("Should allow owner to update base URI", async function () {
      const newBaseURI = "ipfs://QmNewBaseURI/";

      await evolvingNFT.setBaseURI(newBaseURI);

      // Mint and check new URI
      await evolvingNFT.mint(user1.address);
      expect(await evolvingNFT.tokenURI(0)).to.equal(newBaseURI + "1.json");
    });

    it("Should NOT allow non-owner to update base URI", async function () {
      const newBaseURI = "ipfs://QmNewBaseURI/";

      await expect(evolvingNFT.connect(unauthorized).setBaseURI(newBaseURI)).to.be.revertedWithCustomError(
        evolvingNFT,
        "OwnableUnauthorizedAccount",
      );
    });

    it("Should update all token URIs after base URI change", async function () {
      // Mint tokens
      await evolvingNFT.mint(user1.address); // tokenId 0
      await evolvingNFT.mint(user2.address); // tokenId 1

      // Evolve one of them
      await evolvingNFT.evolve(1);

      // Change base URI
      const newBaseURI = "https://new-api.com/meta/";
      await evolvingNFT.setBaseURI(newBaseURI);

      // Check updated URIs
      expect(await evolvingNFT.tokenURI(0)).to.equal(newBaseURI + "1.json");
      expect(await evolvingNFT.tokenURI(1)).to.equal(newBaseURI + "2.json");
    });
  });

  describe("Ownership Transfer", function () {
    it("Should allow owner to transfer ownership", async function () {
      await evolvingNFT.transferOwnership(user1.address);

      expect(await evolvingNFT.owner()).to.equal(user1.address);
    });

    it("Should allow new owner to mint after ownership transfer", async function () {
      await evolvingNFT.transferOwnership(user1.address);

      // Original owner should not be able to mint
      await expect(evolvingNFT.mint(user2.address)).to.be.revertedWithCustomError(
        evolvingNFT,
        "OwnableUnauthorizedAccount",
      );

      // New owner should be able to mint
      await evolvingNFT.connect(user1).mint(user2.address);
      expect(await evolvingNFT.ownerOf(0)).to.equal(user2.address);
    });
  });

  describe("ERC721 Standard Compliance", function () {
    beforeEach(async function () {
      await evolvingNFT.mint(user1.address); // tokenId 0
      await evolvingNFT.mint(user1.address); // tokenId 1
    });

    it("Should support token transfers", async function () {
      await evolvingNFT.connect(user1).transferFrom(user1.address, user2.address, 0);

      expect(await evolvingNFT.ownerOf(0)).to.equal(user2.address);
      expect(await evolvingNFT.balanceOf(user1.address)).to.equal(1);
      expect(await evolvingNFT.balanceOf(user2.address)).to.equal(1);
    });

    it("Should maintain evolution level after transfer", async function () {
      // Evolve token
      await evolvingNFT.evolve(0);
      expect(await evolvingNFT.tokenEvolutionLevel(0)).to.equal(2);

      // Transfer
      await evolvingNFT.connect(user1).transferFrom(user1.address, user2.address, 0);

      // Level should be preserved
      expect(await evolvingNFT.tokenEvolutionLevel(0)).to.equal(2);
      expect(await evolvingNFT.tokenURI(0)).to.equal(BASE_URI + "2.json");
    });

    it("Should support approve and transferFrom", async function () {
      // Approve user2 to transfer token 0
      await evolvingNFT.connect(user1).approve(user2.address, 0);

      // user2 can now transfer the token
      await evolvingNFT.connect(user2).transferFrom(user1.address, user2.address, 0);

      expect(await evolvingNFT.ownerOf(0)).to.equal(user2.address);
    });

    it("Should support setApprovalForAll", async function () {
      // user1 approves user2 for all their tokens
      await evolvingNFT.connect(user1).setApprovalForAll(user2.address, true);

      // user2 can transfer both tokens
      await evolvingNFT.connect(user2).transferFrom(user1.address, user2.address, 0);
      await evolvingNFT.connect(user2).transferFrom(user1.address, user2.address, 1);

      expect(await evolvingNFT.balanceOf(user2.address)).to.equal(2);
      expect(await evolvingNFT.balanceOf(user1.address)).to.equal(0);
    });
  });

  describe("Gas Optimization", function () {
    it("Should mint efficiently", async function () {
      const tx = await evolvingNFT.mint(user1.address);
      const receipt = await tx.wait();

      // Gas usage should be reasonable (adjust threshold as needed)
      const gasUsed = receipt?.gasUsed || 0n;
      console.log(`      Gas used for mint: ${gasUsed.toString()}`);

      // Typical ERC721 mint should be < 150k gas
      expect(gasUsed).to.be.lessThan(150000n);
    });

    it("Should evolve efficiently", async function () {
      await evolvingNFT.mint(user1.address);

      const tx = await evolvingNFT.evolve(0);
      const receipt = await tx.wait();

      const gasUsed = receipt?.gasUsed || 0n;
      console.log(`      Gas used for evolve: ${gasUsed.toString()}`);

      // Evolution should be cheaper than minting (< 100k gas)
      expect(gasUsed).to.be.lessThan(100000n);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle evolution of recently minted token", async function () {
      const tx = await evolvingNFT.mint(user1.address);
      await tx.wait();

      // Immediately evolve
      await evolvingNFT.evolve(0);

      expect(await evolvingNFT.tokenEvolutionLevel(0)).to.equal(2);
    });

    it("Should handle multiple tokens at different levels", async function () {
      // Mint 3 tokens
      await evolvingNFT.mint(user1.address); // token 0
      await evolvingNFT.mint(user1.address); // token 1
      await evolvingNFT.mint(user1.address); // token 2

      // Evolve them to different levels
      await evolvingNFT.evolve(0); // level 2
      await evolvingNFT.evolve(1); // level 2
      await evolvingNFT.evolve(1); // level 3

      expect(await evolvingNFT.tokenEvolutionLevel(0)).to.equal(2);
      expect(await evolvingNFT.tokenEvolutionLevel(1)).to.equal(3);
      expect(await evolvingNFT.tokenEvolutionLevel(2)).to.equal(1);

      // Check URIs
      expect(await evolvingNFT.tokenURI(0)).to.equal(BASE_URI + "2.json");
      expect(await evolvingNFT.tokenURI(1)).to.equal(BASE_URI + "3.json");
      expect(await evolvingNFT.tokenURI(2)).to.equal(BASE_URI + "1.json");
    });

    it("Should handle zero address minting protection", async function () {
      // ERC721 _safeMint should revert for zero address
      await expect(evolvingNFT.mint(ethers.ZeroAddress)).to.be.reverted;
    });
  });
});
