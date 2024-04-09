// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../assets/settlement/ISettlement.sol";

interface IGeography {
    enum TileBonusType {
        NO_BONUS, //0
        ADVANCED_PRODUCTION //1
    }

    struct ZoneActivationParams {
        uint32 cultistsPosition;
    }

    struct TileBonus {
        TileBonusType tileBonusType;
        uint8 tileBonusVariation;
    }

    /// @notice Emitted when #createZone is called
    /// @param zoneId Zone id
    /// @param positions Positions
    /// @param cultistsPosition Cultists position
    /// @param tileBonuses tile bonuses
    event NewZoneCreated(
        uint16 zoneId,
        uint32[] positions,
        uint32 cultistsPosition,
        TileBonus[] tileBonuses
    );

    // State variables



    // Functions

    /// @notice Proxy initializer
    /// @dev Called by address which created current instance
    /// @param worldAddress World address
    function init(address worldAddress) external;

    /// @notice Returns created zones count
    /// @dev Updated when #createZone is called
    /// @return zonesCount Zones count
    function getZonesCount() external view returns (uint256 zonesCount);

    /// @notice Validates provided path
    /// @dev Useful for determining positions path according to current hex grid
    /// @param path Path
    /// @return isValid Is path valid
    function isPathValid(uint32[] memory path) external view returns (bool isValid);

    /// @notice Calculates if provided position are neighbor to other position
    /// @param position Provided position
    /// @param neighbor Other position
    /// @param isNeighbor Is other position neighbor to provided position
    function isNeighborTo(uint32 position, uint32 neighbor) external pure returns (bool isNeighbor);

    /// @notice Returns zone id by position
    /// @param position Provided position
    /// @return zoneId Zone id
    function getZoneIdByPosition(uint32 position) external view returns (uint16 zoneId);

    /// @notice Calculates all ring positions by provided position and radius
    /// @param position Position
    /// @param radius Ring radius
    /// @return ringPositions Ring positions
    /// @return ringPositionsLength Ring positions length (array is initialized 6 * radius, however not all values should be used)
    function getRingPositions(uint32 position, uint256 radius) external pure returns (uint32[] memory ringPositions, uint256 ringPositionsLength);

    /// @notice Creates zone with provided positions and tile types
    /// @dev Even though function is opened, it can be called only by mightyCreator
    /// @param positions Zone positions
    /// @param cultistsCoordinateIndex Coordinate index inside 'positions', where cultists will be placed
    /// @param tileBonuses Zone tile bonuses
    function createZone(
        uint32[] memory positions,
        uint256 cultistsCoordinateIndex,
        TileBonus[] memory tileBonuses
    ) external;

    /// @notice Returns zone activation params for provided zone id
    /// @dev New values are accessible when #createZone is called
    /// @param zoneId Zone id
    /// @return params Zone activation params struct
    function getZoneActivationParams(uint16 zoneId) external view returns (ZoneActivationParams memory params);

    /// @notice Returns tile bonus by provided position
    /// @dev New values are accessible when #createZone is called
    /// @param position Position
    /// @return tileBonus Tile bonus struct
    function getTileBonusByPosition(uint32 position) external view returns (TileBonus memory tileBonus);

    /// @notice Calculates distance between positions
    /// @param position1 First position
    /// @param position2 Second position
    /// @param distance Distance
    function getDistanceBetweenPositions(uint32 position1, uint32 position2) external pure returns (uint32 distance);
}
