// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title EvolvingNFT
 * @dev An NFT that can evolve its level and metadata atomically.
 * The metadata URI is derived from the token's level, making the contract
 * the single source of truth.
 */
contract EvolvingNFT is ERC721, Ownable {
    using Strings for uint256;

    // --- State Variables ---

    /// @dev Counter for the next token ID to be minted.
    uint256 private _nextTokenId;

    /// @dev Base URI for all metadata. Final URI will be: baseURI + level + ".json"
    string private _baseTokenURI;

    /// @dev Mapping to store the NFT's evolution level.
    mapping(uint256 => uint256) public tokenEvolutionLevel;

    // --- Errors ---
    error TokenDoesNotExist();

    // --- Events ---
    event NFT_Evolved(uint256 indexed tokenId, uint256 newLevel);

    // --- Constructor ---

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
    }

    // --- Mint Function ---

    /**
     * @dev Mints a new NFT. Initial level is always 1.
     * Can only be called by the contract owner (the backend).
     */
    function mint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        tokenEvolutionLevel[tokenId] = 1;
        _safeMint(to, tokenId);

        return tokenId;
    }

    // --- Evolution Function ---

    /**
     * @dev Evolves an NFT to the next level atomically.
     * The level change is immediately reflected in the tokenURI.
     * Can only be called by the contract owner (the backend).
     */
    function evolve(uint256 tokenId) public onlyOwner {
        if (_ownerOf(tokenId) == address(0)) {
            revert TokenDoesNotExist();
        }

        uint256 currentLevel = tokenEvolutionLevel[tokenId];
        uint256 newLevel = currentLevel + 1;

        tokenEvolutionLevel[tokenId] = newLevel;

        emit NFT_Evolved(tokenId, newLevel);
    }

    // --- URI Logic ---

    /**
     * @dev Overrides the standard function to build the URI dynamically.
     * Marketplaces like OpenSea will call this function to get the metadata.
     * Returns: "https://myapi.com/meta/1.json", "https://myapi.com/meta/2.json", etc.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) {
            revert TokenDoesNotExist();
        }

        uint256 level = tokenEvolutionLevel[tokenId];

        return
            bytes(_baseTokenURI).length > 0 ? string(abi.encodePacked(_baseTokenURI, level.toString(), ".json")) : "";
    }

    // --- Base URI Management ---

    /**
     * @dev Allows the owner to update the base URI if the metadata location changes.
     */
    function setBaseURI(string memory newBaseTokenURI) public onlyOwner {
        _baseTokenURI = newBaseTokenURI;
    }
}
