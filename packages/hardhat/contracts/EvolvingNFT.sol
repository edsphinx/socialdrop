// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title EvolvingNFT
 * @dev Un NFT que puede evolucionar su nivel y metadatos de forma atómica.
 * La URI de los metadatos se deriva del nivel del token, haciendo al contrato
 * la única fuente de verdad.
 */
contract EvolvingNFT is ERC721, Ownable {
    using Strings for uint256;

    // --- State Variables ---

    // Contador para el siguiente ID de token a ser minteado.
    uint256 private _nextTokenId;

    // La URI base para todos los metadatos. La URI final será: baseURI + level + ".json"
    string private _baseTokenURI;

    // Mapeo para almacenar el nivel evolutivo del NFT.
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
     * @dev Mintea un nuevo NFT. El nivel inicial siempre será 1.
     * Solo puede ser llamado por el dueño del contrato (el backend).
     */
    function mint(address to) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId;
        _nextTokenId++;

        tokenEvolutionLevel[tokenId] = 1; // Nivel inicial
        _safeMint(to, tokenId);

        return tokenId;
    }

    // --- Evolution Function ---

    /**
     * @dev Evoluciona un NFT al siguiente nivel de forma atómica.
     * El cambio de nivel se refleja inmediatamente en el tokenURI.
     * Solo puede ser llamado por el dueño del contrato (el backend).
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
     * @dev Sobrescribe la función estándar para construir la URI dinámicamente.
     * Marketplaces como OpenSea llamarán a esta función para obtener los metadatos.
     * Devuelve: "https://myapi.com/meta/1.json", "https://myapi.com/meta/2.json", etc.
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) {
            revert TokenDoesNotExist();
        }

        uint256 level = tokenEvolutionLevel[tokenId];

        // Concatena la URI base, el nivel del token y la extensión .json
        return
            bytes(_baseTokenURI).length > 0 ? string(abi.encodePacked(_baseTokenURI, level.toString(), ".json")) : "";
    }

    // --- Base URI Management (Opcional por cualquier cosa) ---

    /**
     * @dev Permite al dueño actualizar la URI base si la ubicación de los metadatos cambia.
     */
    function setBaseURI(string memory newBaseTokenURI) public onlyOwner {
        _baseTokenURI = newBaseTokenURI;
    }
}
