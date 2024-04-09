// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../settlement/ISettlement.sol";

/// @title Siege interface
/// @notice Functions to read state/modify state in order to get current siege parameters and/or interact with it
interface ISiege {
    struct ArmyInfo {
        uint256 rewardDebt;
        uint256 points;
    }

    /// @notice Emitted when #addUnits is called
    /// @param from Army address which adds units
    /// @param settlement Settlement address of related siege
    /// @param unitsNames Unit types which were added
    /// @param unitsCount Counts of units which were added
    event UnitsAdded(address indexed from, address indexed settlement, string[] unitsNames, uint256[] unitsCount);

    /// @notice Emitted when #withdrawUnits is called
    /// @param to Army address which receives back its units
    /// @param settlement Settlement address of related siege
    /// @param unitsNames Unit types which were withdrawn
    /// @param unitsCount Counts of units which were withdrawn
    event UnitsWithdrawn(address indexed to, address indexed settlement, string[] unitsNames, uint256[] unitsCount);

    /// @notice Emitted when #addUnits or #withdrawUnits is called in order to preserve previous amount of points were farmed by the army with previous speed
    /// @param armyAddress Army address which received siege points
    /// @param pointsReceived Amount of points received
    event PointsReceived(address indexed armyAddress, uint256 pointsReceived);

    /// @notice Emitted when #claimResources is called
    /// @param armyAddress Army address which spent siege points
    /// @param pointsSpent Amount of points spent
    event PointsSpent(address indexed armyAddress, uint256 pointsSpent);

    /// @notice Emitted when #liquidate is called, emitted for every unit type that was liquidated
    /// @param armyAddress Army address which was liquidated
    /// @param unitName Unit type
    /// @param unitsLiquidated Amount of units liquidated
    event Liquidated(address armyAddress, string unitName, uint256 unitsLiquidated);

    // State variables

    /// @notice Settlement address to which this siege belongs
    /// @dev Immutable, initialized on the siege creation
    function currentSettlement() external view returns (ISettlement);

    /// @notice Mapping containing army information related to current siege
    /// @dev Updated when #addUnits, #withdrawUnits, #claimResource, #liqudate is called
    function armyInfo(address armyAddress) external view returns (uint256 rewardDebt, uint256 points);

    /// @notice Mapping containing amount of stored units in siege for specified army
    /// @dev Updated when #addUnits, #withdrawUnits, #liqudate is called
    function storedUnits(address armyAddress, string memory unitName) external view returns (uint256);

    /// @notice Last time at which siege was updated
    /// @dev Updated when siege parameters related to pointsPerShare were changed
    function lastUpdate() external view returns (uint256);

    /// @notice Amount of point per share
    /// @dev Updated when siege parameters related to armies were changed
    function pointsPerShare() external view returns (uint256);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param settlementAddress Settlement address
    function init(address settlementAddress) external;

    /// @notice Updates current siege to the current state
    /// @dev Synchronizes health up to current state, produces points for besieging armies
    function update() external;

    /// @notice Claims resources for specified points from building related to siege
    /// @dev Even though function is opened, it can be called only by world asset
    /// @param buildingAddress Address of building to rob
    /// @param points Amount of points to spend for robbing
    function claimResources(address buildingAddress, uint256 points) external;

    /// @notice Calculates total damage for provided period of time
    /// @param period Time period to use to calculate damage
    /// @return damage Total damage for provided period of time
    function getTotalDamageByPeriod(uint256 period) external view returns (uint256 damage);

    /// @notice Calculates total damage for period from lastUpdate and block.timestamp
    /// @return damage Total damage for last period
    function getTotalDamageLastPeriod() external view returns (uint256 damage);

    /// @notice Updates siege with new amount of damage fort taken
    /// @dev Even though function is opened, it can be called only by world asset
    function systemUpdate(uint256 totalDamage) external;

    /// @notice Adds units to siege
    /// @dev Even though function is opened, it can be called only by world asset
    /// @param unitsNames Unit types which will be added to siege
    /// @param unitsCount Amounts of units will be added to siege
    function addUnits(string[] memory unitsNames, uint256[] memory unitsCount) external;

    /// @notice Withdraws units from siege
    /// @dev Even though function is opened, it can be called only by world asset
    /// @param unitsNames Unit types which will be withdrawn to siege
    /// @param unitsCount Amounts of units will be withdrawn to siege
    function withdrawUnits(string[] memory unitsNames, uint256[] memory unitsCount) external;

    /// @notice Calculates if provided army address can be liquidated from current siege
    /// @dev Does not take into an account if army's battle is finished and army isn't left the battle
    /// @param armyAddress Address of the army
    /// @return canLiquidate Can army be liquidated from current siege
    function canLiquidate(address armyAddress) external view returns (bool canLiquidate);

    /// @notice Calculates amount of points army will have at specified time
    /// @dev If timestamp=0, returns value as if timestamp=block.timestamp
    /// @param armyAddress Address of the army
    /// @param timestamp Time at which calculate points
    /// @return points Amount of points army will have at specified time
    function getUserPointsOnTime(address armyAddress, uint256 timestamp) external view returns (uint256 points);

    /// @notice Returns amount of stored units for specified army in siege
    /// @dev Function returns only amounts without types, index in returned array for each unit type is same as in 'registry.getUnits'
    /// @param armyAddress Address of the army
    /// @return units Amount of units that army has in siege
    function getStoredUnits(address armyAddress) external view returns (uint256[] memory units);

    /// @notice Calculates total siege stats
    /// @dev Values are calculated for all armies that are present in siege
    /// @return power Total power that placed into siege
    /// @return supply Total supply that siege has
    function calculateTotalSiegeStats() external view returns (uint256 power, uint256 supply);

    /// @notice Liquidates army
    /// @dev Can be called by anyone, caller will receive a reward
    /// @param armyAddress Address of army to liquidate
    function liquidate(address armyAddress) external;

    /// @notice Calculates amount of points army has
    /// @dev Uses block.timestamp at #getUserPointsOnTime
    /// @param armyAddress Address of army
    /// @return points Amount of points army has
    function getUserPoints(address armyAddress) external returns (uint256 points);

    /// @notice Calculates army siege stats
    /// @dev Values are calculated for specified army that is present in siege
    /// @param armyAddress Address of army
    /// @return power Total power that army has
    /// @return supply Total supply that army has
    function calculateArmySiegeStats(address armyAddress) external returns (uint256 power, uint256 supply);
}
