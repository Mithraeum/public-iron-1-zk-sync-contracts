// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Tile capturing system interface
/// @notice Functions to read state/modify state in order to get current system parameters and/or interact with it
interface ITileCapturingSystem {
    struct TileInfo {
        address ownerSettlementAddress;
        address usurperSettlementAddress;
        uint256 usurperProsperityStake;
        uint256 usurperCaptureStartTime;
        uint256 usurperCaptureEndTime;
    }

    /// @notice Emitted when #beginTileCaptureBySettlement is called
    /// @param position Position
    /// @param settlementAddress Settlement address
    /// @param prosperityStake Prosperity stake
    event TileCapturingStarted(
        uint32 position,
        address settlementAddress,
        uint256 prosperityStake
    );

    /// @notice Emitted when #cancelTileCaptureBySettlement
    /// @param position Position
    /// @param settlementAddress Settlement address
    event TileCapturingCancelled(
        uint32 position,
        address settlementAddress
    );

    /// @notice Emitted when #claimTileCaptureBySettlement
    /// @param position Position
    /// @param settlementAddress Settlement address
    /// @param prosperityStake Prosperity stake
    event CapturedTileClaimed(
        uint32 position,
        address settlementAddress,
        uint256 prosperityStake
    );

    /// @notice Emitted when #giveUpCapturedTile
    /// @param position Position
    /// @param settlementAddress Settlement address
    event CapturedTileGivenUp(
        uint32 position,
        address settlementAddress
    );

    // State variables

    /// @notice Mapping containing settlements' current capturing tile
    /// @dev Updated when #beginTileCaptureBySettlement or #claimTileCaptureBySettlement, #cancelTileCaptureBySettlement is called
    function settlementCapturingTile(address settlementAddress) external view returns (uint32);

    /// @notice Mapping containing tile info by provided position
    /// @dev Updated when #beginTileCaptureBySettlement or #claimTileCaptureBySettlement, #cancelTileCaptureBySettlement is called
    function tilesInfo(uint32 position) external view returns (
        address ownerSettlementAddress,
        address usurperSettlementAddress,
        uint256 usurperProsperityStake,
        uint256 usurperCaptureStartTime,
        uint256 usurperCaptureEndTime
    );

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    function init() external;

    /// @notice Begins tile capturing
    /// @dev Even though function is opened, it can be called only by settlement
    /// @param position Position
    function beginTileCaptureBySettlement(uint32 position, uint256 prosperityStake) external;

    /// @notice Cancels tile capturing
    /// @dev Even though function is opened, it can be called only by settlement
    /// @param position Position
    function cancelTileCaptureBySettlement(uint32 position) external;

    /// @notice Gives up captured tile
    /// @dev Even though function is opened, it can be called only by settlement
    /// @param position Position
    function giveUpCapturedTileBySettlement(uint32 position) external;

    /// @notice Claims captured tile
    /// @dev Even though function is opened, it can be called only by settlement
    /// @param position Position
    function claimTileCaptureBySettlement(uint32 position) external;

    /// @notice Returns positions of captured tiles for provided settlement address
    /// @dev Returns only claimed tiles
    /// @param settlementAddress Settlement address
    /// @return positions Positions of captured tiles
    function getCapturedTilesBySettlementAddress(address settlementAddress) external view returns (uint32[] memory positions);

    /// @notice New settlement handler
    /// @dev Even though function is opened, it can be called only by world asset
    /// @param position Position
    /// @param settlementAddress Settlement address
    function handleNewSettlement(uint32 position, address settlementAddress) external;
}
