// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Receiver.sol";

/// @title Banners Nft
/// @notice Acts as ERC721 Nft token, which supports ERC721 and ERC1155 parts as properties of every banner nft
contract Banners is ERC721Enumerable, Ownable, ERC1155Receiver {
    struct Part {
        address addr;
        uint256 id;
    }

    struct BannerData {
        string name;
        Part[16] parts;
        bytes data;
    }

    /// @notice Mapping containing banner data by provided token id
    /// @dev Updated when #updateBanner or #mint is called
    mapping(uint256 => BannerData) public bannerData;

    /// @notice Base URI for computing token uri
    /// @dev Updated on creation or when #updateURI is called
    string public baseURI;

    /// @notice Last created token id
    /// @dev Updated when #mint is called
    uint256 public lastTokenId = 0;

    /// @notice Emitted when #mint is called
    /// @param tokenIndex Newly created token id
    /// @param name Banner name
    /// @param parts Parts struct
    /// @param data Banner custom parameters
    event NewBanner(uint256 tokenIndex, string name, Part[16] parts, bytes data);

    /// @notice Emitted when #updateBanner is called
    /// @param tokenIndex Token id which was updated
    /// @param name New banner name
    /// @param parts New parts struct
    /// @param data New banner custom parameters
    event BannerUpdated(uint256 tokenIndex, string name, Part[16] parts, bytes data);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory uri_
    ) ERC721(name_, symbol_) {
        baseURI = uri_;
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable, ERC1155Receiver)
        returns (bool)
    {
        return ERC721Enumerable.supportsInterface(interfaceId) || ERC1155Receiver.supportsInterface(interfaceId);
    }

    /// @dev Overridden value from ERC721
    function _baseURI() internal view override returns (string memory) {
        return baseURI;
    }

    /// @inheritdoc IERC1155Receiver
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    /// @inheritdoc IERC1155Receiver
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }

    /// @notice Returns banner data with parts
    /// @dev Default mapping read method does not return all data
    /// @param tokenIndex Token index
    /// @return name Banner name
    /// @return parts Banner parts
    /// @return data Banner data
    function getBannerData(uint256 tokenIndex)
        public
        view
        returns (
            string memory name,
            Part[16] memory parts,
            bytes memory data
        )
    {
        return (bannerData[tokenIndex].name, bannerData[tokenIndex].parts, bannerData[tokenIndex].data);
    }

    /// @notice Returns all nfts with their banner data for specified holder address
    /// @dev Used to query all nfts with their data without asking them one by one (may not work for holder with very large amount of nfts)
    /// @param holderAddress Holder address
    /// @return tokenIds Token ids holder owns
    /// @return bannersData Banner data for every token id
    function getBannerDataByUserBatch(address holderAddress)
        public
        view
        returns (uint256[] memory tokenIds, BannerData[] memory bannersData)
    {
        uint256 userBalance = balanceOf(holderAddress);

        bannersData = new BannerData[](userBalance);
        tokenIds = new uint256[](userBalance);

        for (uint256 i = 0; i < userBalance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(holderAddress, i);
            tokenIds[i] = tokenId;
            bannersData[i] = bannerData[tokenId];
        }
    }

    /// @notice Updates base token uri
    /// @dev Only owner can modify base token uri
    function updateURI(string memory _uri) public onlyOwner {
        baseURI = _uri;
    }

    /// @notice Mints banner with specified parameters
    /// @dev Specified banner parts will be taken from msg.sender
    /// @param name Banner name
    /// @param parts Banner parts
    /// @param data Banner custom parameters
    function mint(
        string calldata name,
        Part[16] memory parts,
        bytes memory data
    ) public {
        lastTokenId++;

        bannerData[lastTokenId].name = name;
        bannerData[lastTokenId].data = data;
        addParts(lastTokenId, parts);

        _safeMint(msg.sender, lastTokenId, data);

        emit NewBanner(lastTokenId, name, parts, data);
    }

    /// @dev Transfers specified banner parts from msg.sender to this contract
    function addParts(uint256 tokenId, Part[16] memory parts) internal {
        for (uint256 i = 0; i < parts.length; i++) {
            if (parts[i].addr == address(0)) {
                continue;
            }

            //try 721

            try IERC721(parts[i].addr).safeTransferFrom(msg.sender, address(this), parts[i].id) {} catch (
                bytes memory /*lowLevelData*/
            ) {
                IERC1155(parts[i].addr).safeTransferFrom(msg.sender, address(this), parts[i].id, 1, "0x");
            }

            bannerData[tokenId].parts[i] = parts[i];
        }
    }

    /// @notice Updates banner with specified parameters
    /// @param tokenId banner token id which will be updated, old banner parts, if replaced, will be refunded to the owner
    /// @param name New banner name
    /// @param parts New banner parts
    /// @param data Banner custom parameters
    function updateBanner(
        uint256 tokenId,
        string calldata name,
        Part[16] memory parts,
        bytes memory data
    ) public {
        require(msg.sender == ownerOf(tokenId), "token is not belongs to caller");

        for (uint256 i = 0; i < parts.length; i++) {
            if (parts[i].addr == bannerData[tokenId].parts[i].addr && parts[i].id == bannerData[tokenId].parts[i].id) {
                continue;
            }

            //try 721
            if (parts[i].addr != address(0)) {
                try IERC721(parts[i].addr).safeTransferFrom(msg.sender, address(this), parts[i].id) {} catch (
                    bytes memory /*lowLevelData*/
                ) {
                    IERC1155(parts[i].addr).safeTransferFrom(msg.sender, address(this), parts[i].id, 1, "0x");
                }
            }

            //withdraw previous nft
            if (bannerData[tokenId].parts[i].addr != address(0)) {
                try
                    IERC721(bannerData[tokenId].parts[i].addr).safeTransferFrom(
                        address(this),
                        msg.sender,
                        bannerData[tokenId].parts[i].id
                    )
                {} catch (
                    bytes memory /*lowLevelData*/
                ) {
                    IERC1155(bannerData[tokenId].parts[i].addr).safeTransferFrom(
                        address(this),
                        msg.sender,
                        bannerData[tokenId].parts[i].id,
                        1,
                        "0x"
                    );
                }
            }

            bannerData[tokenId].parts[i] = parts[i];
        }

        bannerData[tokenId].name = name;
        bannerData[tokenId].data = data;
        emit BannerUpdated(tokenId, name, parts, data);
    }
}
