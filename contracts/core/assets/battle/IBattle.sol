// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../IWorld.sol";

/// @title Battle interface
/// @notice Functions to read state/modify state in order to get current battle parameters and/or interact with it
interface IBattle {
    struct Timing {
        uint64 creationTime;
        uint64 lobbyDuration;
        uint64 ongoingDuration;
        uint64 finishTime;
    }

    /// @notice Emitted when army joined battle
    /// @param armyAddress Address of the joined army
    /// @param side Side to which army is joined (sideA = 1, sideB = 2)
    event ArmyJoined(address armyAddress, uint256 side);

    /// @notice Emitted when #finishBattle is called
    /// @param finishTime Time at which battle is finished
    event BattleFinished(uint256 finishTime);

    // State variables

    /// @notice Position at which battle is being held
    /// @dev Immutable, initialized on the battle creation
    function position() external view returns (uint32);

    /// @notice An array of armies joined to side A
    /// @dev Updated when army joins side A
    /// @param index Index inside the array
    /// @return armyAddress Army address at the specified index
    function sideA(uint256 index) external view returns (address armyAddress);

    /// @notice An array of armies joined to side B
    /// @dev Updated when army joins side B
    /// @param index Index inside the array
    /// @return armyAddress Army address at the specified index
    function sideB(uint256 index) external view returns (address armyAddress);

    /// @notice Mapping that contains units amount by side and unit type
    /// @dev Updated when army joins side
    /// @param side Side of which query units amount (sideA = 1, sideB = 2)
    /// @param unitName Unit type to query
    /// @return unitsCount Amount of units by specified side and unit type
    function sideUnitsCount(uint256 side, string memory unitName) external view returns (uint256 unitsCount);

    /// @notice Mapping that contains amount of units by army address and unit type
    /// @dev Updated when army joins battle
    /// @param armyAddress Address of the army
    /// @param unitName Unit type to query
    /// @return unitsCount Amount of units by army address and unit type
    function armyUnitsCount(address armyAddress, string memory unitName) external view returns (uint256 unitsCount);

    /// @notice Mapping that contains amount of casualties after battle is finished
    /// @dev Updated when #startBattle is called
    /// @param side Side of which query casualties amount (sideA = 1, sideB = 2)
    /// @param unitName Unit type to query
    /// @return casualtiesCount Amount of casualties by side and unit type
    function casualties(uint256 side, string memory unitName) external view returns (uint256 casualtiesCount);

    /// @notice Mapping that contains side at which joined army is on
    /// @dev Updated when #acceptArmyInBattle is called
    /// @param armyAddress Address of the army
    /// @return armySide Side of specified army (sideA = 1, sideB = 2)
    function armySide(address armyAddress) external view returns (uint256 armySide);

    /// @notice Battle time parameters
    /// @dev Updated when battle initialized, first armies joined and finished (#initBattle, #acceptArmyInBattle, #startBattle)
    /// @return creationTime Time when battle is created
    /// @return lobbyDuration Lobby duration, initialized when first two armies joined
    /// @return ongoingDuration Ongoing duration, initialized when first two armies joined
    /// @return finishTime Time when battle is finished
    function timing()
        external
        view
        returns (
            uint64 creationTime,
            uint64 lobbyDuration,
            uint64 ongoingDuration,
            uint64 finishTime
        );

    /// @notice Winning side
    /// @dev Updated when #finishBattle is called
    /// @return winningSide Winning side (no winner = 0, sideA = 1, sideB = 2)
    function winningSide() external view returns (uint256 winningSide);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param attackerArmyAddress Attacker army address
    /// @param attackedArmyAddress Attacked army address
    function init(address attackerArmyAddress, address attackedArmyAddress) external;

    /// @notice Calculates amount of armies joined to side A
    /// @dev Basically returns length of sideA array
    /// @return armiesCount Amount of armies joined to side A
    function getSideALength() external view returns (uint256 armiesCount);

    /// @notice Calculates amount of armies joined to side B
    /// @dev Basically returns length of sideA array
    /// @return armiesCount Amount of armies joined to side B
    function getSideBLength() external view returns (uint256 armiesCount);

    /// @notice Accepts army in battle
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param armyAddress Army address
    /// @param side Side to which army will join
    function acceptArmyInBattle(address armyAddress, uint256 side) external;

    /// @notice Removes army from battle
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param armyAddress Army address
    function removeArmyFromBattle(address armyAddress) external;

    /// @notice Finishes battle
    /// @dev Sets finish time
    function finishBattle() external;

    /// @notice Calculates casualties for first battle stage
    /// @dev Uses values from battles' sideUnitsCount in order to calculate casualties (can be executed while battle is still not fully formed)
    /// @return sideACasualties Side A casualties
    /// @return sideBCasualties Side B casualties
    /// @return stageParams Stage params (encoded abi.encode(sideAOffense, sideBOffense, sideADefence, sideBDefence))
    function calculateStage1Casualties()
        external
        view
        returns (
            uint256[] memory sideACasualties,
            uint256[] memory sideBCasualties,
            bytes memory stageParams
        );

    /// @notice Calculates casualties for second battle stage (based on casualties from first battle stage)
    /// @dev Uses values from battles' sideUnitsCount in order to calculate casualties (can be executed while battle is still not fully formed)
    /// @param stage1SideACasualties Stage 1 side A casualties
    /// @param stage1SideBCasualties Stage 1 side B casualties
    /// @return sideACasualties Side A casualties
    /// @return sideBCasualties Side B casualties
    /// @return stageParams Stage params (encoded abi.encode(sideAOffense, sideBOffense, sideADefence, sideBDefence))
    function calculateStage2Casualties(
        uint256[] memory stage1SideACasualties,
        uint256[] memory stage1SideBCasualties
    )
        external
        view
        returns (
            uint256[] memory sideACasualties,
            uint256[] memory sideBCasualties,
            bytes memory stageParams
        );

    /// @notice Calculates casualties for all battle stages
    /// @dev Uses values from battles' sideUnitsCount in order to calculate casualties (can be executed while battle is still not fully formed)
    /// @return sideACasualties Side A casualties
    /// @return sideBCasualties Side A casualties
    /// @return winningSide Winning side (0 - both sides lost, 1 - side A Won, 2 - side B Won
    function calculateAllCasualties()
        external
        view
        returns (
            uint256[] memory sideACasualties,
            uint256[] memory sideBCasualties,
            uint256 winningSide
        );

    /// @notice Calculates lobby and ongoing duration
    /// @dev Returns same value as #calculateTimings but without the need to provide all parameters
    /// @param isCultistsAttacked Is cultists attacked
    /// @param maxBattleDuration Max allowed battle duration
    /// @param sideAUnitsCount Side A units count
    /// @param sideBUnitsCount Side B units count
    /// @return lobbyDuration Lobby duration
    /// @return ongoingDuration Ongoing duration
    function getTimings(
        bool isCultistsAttacked,
        uint256 maxBattleDuration,
        uint256 sideAUnitsCount,
        uint256 sideBUnitsCount
    ) external view returns (uint64 lobbyDuration, uint64 ongoingDuration);

    /// @notice Calculates if battle can be finished
    /// @dev Checks if finishTime is set and current block.timestamp > creationTime + lobbyDuration + ongoingDuration
    /// @return canFinishBattle Can battle be finished
    function canFinishBattle() external view returns (bool canFinishBattle);

    /// @notice Calculates if battle is finished
    /// @dev Checks if finishTime is not zero
    /// @return isFinishedBattle Is finished battle
    function isFinishedBattle() external view returns (bool isFinishedBattle);

    /// @notice Calculates casualties for specified army
    /// @dev Provides valid results only for finished battle
    /// @param armyAddress Address of army presented in battle
    /// @return isArmyWon Is army won
    /// @return unitAmounts Amount of casualties for related unit types
    function calculateArmyCasualties(address armyAddress)
        external
        view
        returns (
            bool isArmyWon,
            uint256[] memory unitAmounts
        );

    /// @notice Calculates if lobby is opened
    /// @dev Calculates if lobby is opened
    /// @return isLobbyTime Is lobby is opened
    function isLobbyTime() external view returns (bool isLobbyTime);

    /// @notice Calculates lobby duration and ongoing duration based on specified parameters
    /// @dev globalMultiplier, baseLobbyDuration, baseOngoingDuration parameters from registry
    /// @param globalMultiplier Global multiplier (from registry)
    /// @param baseBattleDuration Base battle duration (from registry)
    /// @param battleLobbyDurationPercent Battle lobby duration percent (from registry)
    /// @param isCultistsAttacked Is cultists attacked
    /// @param units1 Amount of units from attacker army
    /// @param units2 Amount of units from attacked army
    /// @param maxBattleDuration Max allowed battle duration
    /// @return lobbyDuration Lobby duration
    /// @return ongoingDuration Ongoing duration
    function calculateTimings(
        uint256 globalMultiplier,
        uint256 baseBattleDuration,
        uint256 battleLobbyDurationPercent,
        bool isCultistsAttacked,
        uint256 units1,
        uint256 units2,
        uint256 maxBattleDuration
    ) external view returns (uint64 lobbyDuration, uint64 ongoingDuration);
}
