// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../core/assets/army/IArmy.sol";
import "../core/assets/epoch/IEpoch.sol";
import "../core/assets/IWorldAsset.sol";
import "../core/assets/battle/IBattle.sol";
import "../libraries/MathExtension.sol";

/// @title Army view contract
/// @notice Contains helper functions to query army in simple read requests
contract ArmyView {
    struct ArmyCombinedData {
        address id;
        address owner;
        address ownerSettlementId;
        uint32 currentPosition;
        address currentPositionSettlementId;
        address battleId;
        uint256[] units;
        uint256[] besiegingUnits;
        uint256 robberyTokensCount;
        uint32[] currentPath;
        uint64 stunStartTime;
        uint64 stunEndTime;
        uint64 movementStartTime;
        uint64 movementEndTime;
        address destinationPositionSettlementId;
        uint256 lastDemilitarizationTime;
    }

    /// @dev Calculates army owner
    function getArmyOwner(IArmy army) internal view returns (address) {
        bool isCultistArmy = address(army.currentSettlement()) == address(army.currentSettlement().currentZone().cultistsSettlement());
        return !isCultistArmy ? army.currentSettlement().getSettlementOwner() : address(0);
    }

    /// @dev Calculates if battle can be finished at provided timestamp
    function canFinishBattleAtProvidedTimestamp(
        IBattle battle,
        uint256 timestamp
    ) internal view returns (bool) {
        (uint64 creationTime, uint64 lobbyDuration, uint64 ongoingDuration, uint64 finishTime) = battle.timing();
        return creationTime > 0 && timestamp >= creationTime + lobbyDuration + ongoingDuration;
    }

    /// @notice Calculates combined army data
    /// @dev Provided timestamp takes into account only robberyTokensCount
    /// @param armyAddress Army address
    /// @param timestamp Timestamp at which robberyTokensCount will be calculated
    /// @return armyCombinedData Army combined data
    function getArmyCombinedData(address armyAddress, uint256 timestamp)
        public
        view
        returns (ArmyCombinedData memory armyCombinedData)
    {
        if (timestamp == 0) {
            timestamp = block.timestamp;
        }

        IArmy army = IArmy(armyAddress);

        IWorld world = IWorldAsset(armyAddress).world();
        IEpoch epoch = IWorldAsset(armyAddress).epoch();

        string[] memory units = world.registry().getUnits();

        armyCombinedData.id = armyAddress;

        armyCombinedData.currentPosition = army.currentPosition();
        armyCombinedData.currentPositionSettlementId = address(epoch.settlements(armyCombinedData.currentPosition));
        armyCombinedData.currentPath = army.getMovementPath();
        armyCombinedData.destinationPositionSettlementId = armyCombinedData.currentPath.length > 0
            ? address(epoch.settlements(armyCombinedData.currentPath[armyCombinedData.currentPath.length - 1]))
            : address(0);

        (armyCombinedData.stunStartTime, armyCombinedData.stunEndTime) = army.stunTiming();
        (armyCombinedData.movementStartTime, armyCombinedData.movementEndTime) = army.movementTiming();

        if (armyCombinedData.movementEndTime != 0 && timestamp >= armyCombinedData.movementEndTime) {
            armyCombinedData.currentPosition = armyCombinedData.currentPath[armyCombinedData.currentPath.length - 1];
            armyCombinedData.currentPositionSettlementId = armyCombinedData.destinationPositionSettlementId;
            armyCombinedData.currentPath = new uint32[](0);
            armyCombinedData.destinationPositionSettlementId = address(0);

            uint64 movementDuration = armyCombinedData.movementEndTime - armyCombinedData.movementStartTime;
            uint64 movementStunDuration = uint64(movementDuration * world.registry().getMovementDurationStunMultiplier() / 1e18);
            uint64 movementStunStartTime = armyCombinedData.movementEndTime;
            uint64 movementStunEndTime = movementStunStartTime + movementStunDuration;

            if (movementStunEndTime > armyCombinedData.stunEndTime) {
                armyCombinedData.stunStartTime = movementStunStartTime;
                armyCombinedData.stunEndTime = movementStunEndTime;
            }

            armyCombinedData.movementStartTime = 0;
            armyCombinedData.movementEndTime = 0;
        }

        armyCombinedData.owner = getArmyOwner(army);
        armyCombinedData.ownerSettlementId = address(army.currentSettlement());

        armyCombinedData.units = new uint256[](units.length);

        for (uint256 i = 0; i < units.length; i++) {
            armyCombinedData.units[i] = epoch.units(units[i]).balanceOf(armyAddress);
        }

        armyCombinedData.battleId = address(army.battle());
        if (armyCombinedData.battleId != address(0)) {
            IBattle battle = IBattle(armyCombinedData.battleId);
            if (canFinishBattleAtProvidedTimestamp(battle, timestamp)) {
                (bool isArmyWon, uint256[] memory casualties) = battle.calculateArmyCasualties(armyAddress);
                for (uint256 i = 0; i < units.length; i++) {
                    armyCombinedData.units[i] = armyCombinedData.units[i] - casualties[i];
                }

                if (!isArmyWon) {
                    (uint64 battleCreationTime, uint64 lobbyDuration, uint64 ongoingDuration,) = battle.timing();
                    uint64 battleDuration = lobbyDuration + ongoingDuration;
                    uint64 stunDuration = uint64(battleDuration * world.registry().getBattleDurationStunMultiplier() / 1e18);
                    uint64 battleStunStartTime = battleCreationTime + battleDuration;
                    uint64 battleStunEndTime = battleStunStartTime + stunDuration;
                    if (battleStunEndTime > armyCombinedData.stunEndTime) {
                        armyCombinedData.stunStartTime = battleStunStartTime;
                        armyCombinedData.stunEndTime = battleStunEndTime;
                    }
                }

                armyCombinedData.battleId = address(0);
            }
        }

        if (timestamp >= armyCombinedData.stunEndTime) {
            armyCombinedData.stunStartTime = 0;
            armyCombinedData.stunEndTime = 0;
        }

        armyCombinedData.besiegingUnits = new uint256[](units.length);

        if (address(army.siege()) != address(0)) {
            ISiege siege = army.siege();
            armyCombinedData.robberyTokensCount = siege.getUserPointsOnTime(armyAddress, timestamp);
            armyCombinedData.besiegingUnits = siege.getStoredUnits(armyAddress);
        }

        armyCombinedData.lastDemilitarizationTime = army.lastDemilitarizationTime();
    }
}
