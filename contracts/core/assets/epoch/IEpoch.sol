// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../settlement/ISettlement.sol";
import "../tileCapturingSystem/ITileCapturingSystem.sol";
import "../tokens/resources/IResource.sol";

/// @title Epoch interface
/// @notice Functions to read state/modify state in order to get current epoch parameters and/or interact with it
interface IEpoch {
    /// @notice Emitted when epoch resource is created
    /// @param resourceAddress Resource address
    /// @param resourceName Resource name
    event NewResource(
        address resourceAddress,
        string resourceName
    );

    /// @notice Emitted when epoch units is created
    /// @param unitsAddress Units address
    /// @param unitsName Units name
    event NewUnits(
        address unitsAddress,
        string unitsName
    );

    /// @notice Emitted when epoch workers is created
    /// @param workersAddress Workers address
    event NewWorkers(
        address workersAddress
    );

    /// @notice Emitted when epoch prosperity is created
    /// @param prosperityAddress Prosperity address
    event NewProsperity(
        address prosperityAddress
    );

    /// @notice Emitted when epoch tile capturing system is created
    /// @param tileCapturingSystemAddress Tile capturing system address
    event NewTileCapturingSystem(
        address tileCapturingSystemAddress
    );

    /// @notice Emitted when #activateZone is called
    /// @param zoneAddress Zone address
    /// @param zoneId Zone index
    event NewZoneActivated(
        address zoneAddress,
        uint256 zoneId
    );

    /// @notice Emitted when #newAssetSettlement is called
    /// @param contractAddress Created settlement address
    /// @param scriptName Settlement type (BASIC/CULTISTS)
    /// @param zoneAddress Address of the zone where settlement is created
    /// @param position Position
    event NewSettlement(
        address indexed contractAddress,
        string scriptName,
        address zoneAddress,
        uint32 position
    );

    // State variables

    /// @notice An array of attached zones to the continent
    /// @dev Updated when #attachZoneToTheContinent is called
    function zones(uint256 index) external view returns (IZone);

    /// @notice Mapping containing settlement by provided x and y coordinates
    /// @dev Updated when new settlement is created
    function settlements(uint32 position) external view returns (ISettlement);

    /// @notice Most recent cultists summon time
    /// @dev Updated when #increaseTotalCultists is called
    function mostRecentCultistsSummonTime() external view returns (uint256);

    /// @notice Total cultists
    /// @dev Updated when #increaseTotalCultists or #decreaseTotalCultists is called
    function totalCultists() external view returns (uint256);

    /// @notice Workers token
    /// @dev Updated when #setWorkersContract is called
    function workers() external view returns (IWorkers);

    /// @notice Prosperity token
    /// @dev Updated when #setProsperityContract is called
    function prosperity() external view returns (IProsperity);

    /// @notice Mapping containing settlement address by provided banner id
    /// @dev Updated when #addUserSettlement is called
    function userSettlements(uint256 val) external view returns (ISettlement);

    /// @notice Mapping containing game resources by name
    /// @dev Updated when #addResource is called
    function resources(string memory name) external view returns (IResource);

    /// @notice Mapping containing units by name
    /// @dev Updated when #addUnit is called
    function units(string memory name) external view returns (IUnits);

    /// @notice Tile capturing system
    /// @dev Updated when #setTileCapturingSystemContract is called
    function tileCapturingSystem() external view returns (ITileCapturingSystem);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param epochNumber Epoch number
    function init(uint256 epochNumber) external;

    /// @notice Activates zone
    /// @dev Even though function is opened, it can be called only by mightyCreator
    /// @param zoneId Zone id
    function activateZone(uint16 zoneId) external;

    /// @notice Restores settlement from previous epoch by provided position
    /// @dev Any address can restore user settlement
    /// @param position Position
    function restoreSettlement(
        uint32 position
    ) external;

    /// @notice Creates new user settlement
    /// @dev Bless tokens will be deducted from msg.sender
    /// @param position Position
    /// @param ownerTokenId Banners token id which will represent to which settlement will be attached to
    /// @param settlementPrice Settlement price
    /// @param settlementPurchaseTime Settlement purchase time
    /// @return settlementAddress Settlement address
    function newSettlement(
        uint32 position,
        uint256 ownerTokenId,
        uint256 settlementPrice,
        uint256 settlementPurchaseTime
    ) external returns (address settlementAddress);

    /// @notice Creates settlement by type
    /// @dev Even though function is opened, it can be called only by world asset
    /// @param ownerTokenId Banners token id which will represent to which settlement will be attached to
    /// @param position Position
    /// @param assetName Settlement type (BASIC/CULTISTS)
    /// @param performAttachmentValidation Whether is to perform attachment validation or not (CULTISTS or restored BASIC may not be attached to anything)
    function newAssetSettlement(
        uint256 ownerTokenId,
        uint32 position,
        string memory assetName,
        bool performAttachmentValidation
    ) external returns (address);

    /// @notice Summons cultists in specified zones
    /// @dev Batch cultists summon
    /// @param zoneIds Zone ids
    function summonCultistsBatch(
        uint16[] memory zoneIds
    ) external;

    /// @notice Increases total cultists
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param cultistsArmyAddress Cultists army address
    /// @param value Amount of cultists minted
    function increaseTotalCultists(
        address cultistsArmyAddress,
        uint256 value
    ) external;

    /// @notice Decreases total cultists
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param cultistsArmyAddress Cultists army address
    /// @param value Amount of cultists burned
    function decreaseTotalCultists(
        address cultistsArmyAddress,
        uint256 value
    ) external;
}
