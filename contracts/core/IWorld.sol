// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./IRegistry.sol";
import "./assets/epoch/IEpoch.sol";
import "./geography/IGeography.sol";
import "./crossEpochsMemory/ICrossEpochsMemory.sol";
import "./rewardPool/IRewardPool.sol";
import "./distributions/IDistributions.sol";

/// @title World interface
/// @notice Functions to read state/modify state of game world
interface IWorld {
    /// @notice Emitted when world initialized
    /// @param registryContractAddress Registry contract address
    /// @param geographyAddress Geography contract address
    /// @param bannersAddress Mithraeum banners contract address
    /// @param blessTokenAddress Bless token address
    /// @param distributionsAddress Distributions token address
    /// @param rewardPoolAddress Reward pool address
    event WorldInitialized(
        address registryContractAddress,
        address geographyAddress,
        address bannersAddress,
        address blessTokenAddress,
        address distributionsAddress,
        address rewardPoolAddress
    );

    /// @notice Emitted when #setGameStartTime is called
    /// @param timestamp New game start time
    event GameStartTimeUpdated(uint timestamp);

    /// @notice Emitted when #setGameFinishTime is called
    /// @param timestamp New game finish time
    event GameFinishTimeUpdated(uint timestamp);

    /// @notice Emitted when world initialized or #destroyCurrentEpoch is called
    /// @param epochAddress New epoch address
    /// @param epochNumber New epoch number
    event NewWorldEpoch(address epochAddress, uint256 epochNumber);

    /// @notice Emitted after new epoch initialization
    /// @param epochNumber New epoch number
    event CurrentEpochNumberUpdated(uint256 epochNumber);

    // State variables

    /// @notice Registry
    /// @dev Immutable, initialized on creation
    function registry() external view returns (IRegistry);

    /// @notice Banners token
    /// @dev Immutable, initialized on creation
    function bannerContract() external view returns (IERC721);

    /// @notice Bless token
    /// @dev Immutable, initialized on creation
    function blessToken() external view returns (IERC20);

    /// @notice Distributions token
    /// @dev Immutable, initialized on creation
    function distributions() external view returns (IDistributions);

    /// @notice Cross epochs memory
    /// @dev Immutable, initialized on creation
    function crossEpochsMemory() external view returns (ICrossEpochsMemory);

    /// @notice Reward pool
    /// @dev Immutable, initialized on creation
    function rewardPool() external view returns (IRewardPool);

    /// @notice Game start time
    /// @dev Updated when #setGameStartTime is called
    function gameStartTime() external view returns (uint256);

    /// @notice Game finish time
    /// @dev Updated when #setGameFinishTime is called
    function gameFinishTime() external view returns (uint256);

    /// @notice Geography
    /// @dev Immutable, initialized on creation
    function geography() external view returns (IGeography);

    /// @notice Current world epoch
    /// @dev Updated when #destroy is called
    function currentEpochNumber() external view returns (uint256);

    /// @notice World epochs
    /// @dev Updated when world initialized or #destroy is called
    function epochs(uint256 epochNumber) external view returns (IEpoch);

    /// @notice Mapping containing world asset type by provided epoch number and address
    /// @dev Updated when #addWorldAsset is called
    function worldAssets(uint256 epochNumber, address worldAsset) external view returns (bytes32);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by address which created current instance
    /// @param registryContractAddress Registry contract address
    /// @param crossEpochsMemoryAddress Cross epochs memory address
    /// @param geographyAddress Geography contract address
    /// @param bannersAddress Banners token address
    /// @param blessTokenAddress Bless token address
    /// @param distributionsAddress Distributions token address
    /// @param rewardPoolAddress Reward pool address
    function init(
        address registryContractAddress,
        address crossEpochsMemoryAddress,
        address geographyAddress,
        address bannersAddress,
        address blessTokenAddress,
        address distributionsAddress,
        address rewardPoolAddress
    ) external;

    /// @notice Adds an address as world asset
    /// @dev Even though function is opened, it can only be called by factory contract
    /// @param epochNumber Epoch number
    /// @param worldAssetAddress World asset address
    /// @param assetType Asset type
    function addWorldAsset(
        uint256 epochNumber,
        address worldAssetAddress,
        bytes32 assetType
    ) external;

    /// @notice Mints workers to provided address
    /// @dev Even though function is opened, it can only be called by mighty creator
    /// @param epochNumber Epoch number
    /// @param to Address which will receive workers
    /// @param value Amount of workers to mint
    function mintWorkers(
        uint256 epochNumber,
        address to,
        uint256 value
    ) external;

    /// @notice Mints units to provided address
    /// @dev Even though function is opened, it can only be called by mighty creator
    /// @param epochNumber Epoch number
    /// @param unitName Type of unit to mint
    /// @param to Address which will receive units
    /// @param value Amount of units to mint
    function mintUnits(
        uint256 epochNumber,
        string memory unitName,
        address to,
        uint256 value
    ) external;

    /// @notice Mints resource to provided address
    /// @dev Even though function is opened, it can only be called by mighty creator
    /// @param epochNumber Epoch number
    /// @param resourceName Resource name
    /// @param to Address which will receive resources
    /// @param value Amount of resources to mint
    function mintResources(
        uint256 epochNumber,
        string memory resourceName,
        address to,
        uint256 value
    ) external;

    /// @notice Transfers multiple resources to provided address
    /// @dev Uses msg.sender as resources sender
    /// @param epochNumber Epoch number
    /// @param to An address which will receive resources
    /// @param resourcesNames Resources names
    /// @param amounts Amount of each resources to transfer
    function batchTransferResources(
        uint256 epochNumber,
        address to,
        string[] calldata resourcesNames,
        uint256[] calldata amounts
    ) external;

    /// @notice Sets game finish time
    /// @dev Even though function is opened, it can only be called by mighty creator or reward pool
    /// @param gameFinishTime Game finish time
    function setGameFinishTime(uint256 gameFinishTime) external;

    /// @notice Sets game start time
    /// @dev Even though function is opened, it can only be called by mighty creator
    /// @param gameStartTime Game start time
    function setGameStartTime(uint256 gameStartTime) external;

    /// @notice Destroys current epoch if conditions are met
    /// @dev Anyone can call this function
    function destroyCurrentEpoch() external;
}
