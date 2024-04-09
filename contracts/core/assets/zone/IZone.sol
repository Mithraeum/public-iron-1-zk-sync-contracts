// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../workersPool/IWorkersPool.sol";
import "../epoch/IEpoch.sol";
import "../unitsPool/IUnitsPool.sol";
import "../settlement/ISettlement.sol";
import "../settlementsMarket/ISettlementMarket.sol";

/// @title Zone interface
/// @notice Functions to read state/modify state in order to get current zone parameters and/or interact with it
interface IZone {
    /// @notice Emitted when zone initialized
    /// @param workersPoolAddress Workers pool address
    event WorkersPoolCreated(address workersPoolAddress);

    /// @notice Emitted when zone initialized
    /// @param settlementsMarketAddress Settlements market address
    event SettlementsMarketCreated(address settlementsMarketAddress);

    /// @notice Emitted when zone initialized
    /// @param unitsPoolAddress Units pool address
    /// @param unitType Unit type
    event UnitsPoolCreated(address unitsPoolAddress, string unitType);

    /// @notice Emitted when #increaseToxicity is called
    /// @param settlementAddress An address of settlement which triggered toxicity increase
    /// @param value Amount of added toxicity
    event ToxicityIncreased(address settlementAddress, uint256 value);

    /// @notice Emitted when #decreaseToxicity is called
    /// @param settlementAddress An address of settlement which triggered toxicity decrease
    /// @param value Amount of subtracted toxicity
    event ToxicityDecreased(address settlementAddress, uint256 value);

    /// @notice Emitted when #updateState is called
    /// @param lastUpdateStateTime Time at which zone time changed
    /// @param lastUpdateStateZoneTime Current zone time
    event ZoneTimeChanged(uint256 lastUpdateStateTime, uint256 lastUpdateStateZoneTime);

    // State variables

    /// @notice Workers pool
    /// @dev Immutable, initialized on the zone creation
    function workersPool() external view returns (IWorkersPool);

    /// @notice Mapping containing units pool for provided unit type
    /// @dev Immutable, initialized on the zone creation
    function unitsPools(string memory unitName) external view returns (IUnitsPool);

    /// @notice Mapping containing units market for provided unit type
    /// @dev Immutable, initialized on the zone creation
    function settlementsMarket() external view returns (ISettlementsMarket);

    /// @notice Cultists settlement of this zone
    /// @dev Immutable, initialized on the zone creation
    function cultistsSettlement() external view returns (ISettlement);

    /// @notice Last time cultists were summoned in this zone
    /// @dev Updated when #summonCultists is called
    function cultistsSummonTime() external view returns (uint256);

    /// @notice Amount of toxicity in this zone
    /// @dev Updated when #increaseToxicity or #decreaseToxicity is called
    function toxicity() external view returns (int256);

    /// @notice Zone id
    /// @dev Immutable, initialized on the zone creation
    function zoneId() external view returns (uint16);

    /// @notice Last apply state time
    /// @dev Updated when #updateState is called
    function lastUpdateStateTime() external view returns (uint256);

    /// @notice Last apply state zone time
    /// @dev Updated when #updateState is called
    function lastUpdateStateZoneTime() external view returns (uint256);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param zoneId Zone id
    function init(uint16 zoneId) external;

    /// @notice Creates cultists settlement
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param cultistsPosition Cultists position
    function createCultists(uint32 cultistsPosition) external;

    /// @notice Buys specified units for specified amount of weapons in current zone
    /// @dev If resourcesOwner == address(0) -> resources will be taken from msg.sender
    /// @dev If resourcesOwner != address(0) and resourcesOwner has given allowance to msg.sender >= amount of weapons for units -> resources will be taken from resourcesOwner
    /// @param resourcesOwner Resources owner
    /// @param settlementAddress Settlement's address army of which will receive units
    /// @param unitNames Unit types
    /// @param unitsCounts Units counts
    /// @param maxWeaponsToSell Maximum amounts of weapons to sell for each unit types
    function buyUnitsBatch(
        address resourcesOwner,
        address settlementAddress,
        string[] memory unitNames,
        uint256[] memory unitsCounts,
        uint256[] memory maxWeaponsToSell
    ) external;

    /// @notice Summons cultists if conditions are met
    /// @dev Anyone can call this function
    function summonCultists() external;

    /// @notice Increases toxicity relative to specified resources amount
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param settlementAddress An address of the settlement which triggered toxicity increase
    /// @param resourceName Resource name
    /// @param value Amount of resource
    function increaseToxicity(
        address settlementAddress,
        string memory resourceName,
        uint256 value
    ) external;

    /// @notice Decreases toxicity relative to specified resources amount
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param settlementAddress An address of the settlement which triggered toxicity decrease
    /// @param resourceName Resource name
    /// @param value Amount of resource
    function decreaseToxicity(
        address settlementAddress,
        string memory resourceName,
        uint256 value
    ) external;

    /// @notice Zone cultists summon handler
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param cultistsArmyAddress Cultists army address
    /// @param value Amount of cultists minted
    function handleCultistsSummoned(
        address cultistsArmyAddress,
        uint256 value
    ) external;

    /// @notice Zone cultists defeat handler
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param cultistsArmyAddress Cultists army address
    /// @param value Amount of cultists burned
    function handleCultistsDefeated(
        address cultistsArmyAddress,
        uint256 value
    ) external;

    /// @notice Calculates penalty according to current cultists count
    /// @dev Uses unit.balanceOf to determine penalty
    /// @return penalty Penalty from cultists
    function getPenaltyFromCultists() external view returns (uint256 penalty);

    /// @notice Updates zone state
    /// @dev This function is called every time when production should be modified
    function updateState() external;

    /// @notice Calculates zone time with provided timestamp
    /// @dev Takes into an account previous value and current cultists penalty and extrapolates to value at provided timestamp
    /// @param timestamp Timestamp
    /// @return zoneTime Extrapolated zone time
    function getZoneTime(uint256 timestamp) external view returns (uint256 zoneTime);
}
