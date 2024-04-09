// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../core/assets/battle/IBattle.sol";
import "../core/assets/IWorldAsset.sol";

/// @title Battle view contract
/// @notice Contains helper functions to query battle in simple read requests
contract BattleView {
    struct BattleCombinedData {
        address id;
        uint64 battleCreationDate;
        uint64 battleLobbyDuration;
        uint64 battleOngoingDuration;
        uint64 battleFinishDate;
        address battleSettlementId;
        uint32 battleGamePosition;
        uint256[] sideACasualties;
        uint256[] sideBCasualties;
        uint256[] sideAUnitsCount;
        uint256[] sideBUnitsCount;
    }

    /// @notice Calculates combined battle data
    /// @dev In case of very big battle, this function may not work due to array nature of battle sides
    /// @param battleAddress Battle address
    /// @return battleCombinedData Battle combined data
    function getBattleCombinedData(address battleAddress) public view returns (BattleCombinedData memory battleCombinedData) {
        IBattle battle = IBattle(battleAddress);
        IWorld world = IWorldAsset(battleAddress).world();
        IEpoch epoch = IWorldAsset(battleAddress).epoch();

        string[] memory units = world.registry().getUnits();
        uint256 totalUnitTypes = units.length;

        uint256[] memory sideACasualties = new uint256[](totalUnitTypes);
        uint256[] memory sideBCasualties = new uint256[](totalUnitTypes);

        uint256[] memory sideAUnitsCount = new uint256[](totalUnitTypes);
        uint256[] memory sideBUnitsCount = new uint256[](totalUnitTypes);

        for (uint256 i = 0; i < totalUnitTypes; i++) {
            string memory unitName = units[i];

            sideAUnitsCount[i] = battle.sideUnitsCount(1, unitName);
            sideBUnitsCount[i] = battle.sideUnitsCount(2, unitName);

            sideACasualties[i] = battle.casualties(1, unitName);
            sideBCasualties[i] = battle.casualties(2, unitName);
        }

        IBattle.Timing memory timing = getBattleTiming(battleAddress);
        uint32 position = IBattle(battleAddress).position();

        return
            BattleCombinedData({
                id: battleAddress,
                battleCreationDate: timing.creationTime,
                battleLobbyDuration: timing.lobbyDuration,
                battleOngoingDuration: timing.ongoingDuration,
                battleFinishDate: timing.finishTime,
                battleSettlementId: address(epoch.settlements(position)),
                battleGamePosition: position,
                sideAUnitsCount: sideAUnitsCount,
                sideBUnitsCount: sideBUnitsCount,
                sideACasualties: sideACasualties,
                sideBCasualties: sideBCasualties
            });
    }

    function getBattleTiming(address battleAddress) public view returns (IBattle.Timing memory timing) {
        IBattle battle = IBattle(battleAddress);
        (uint64 creationTime, uint64 lobbyDuration, uint64 ongoingDuration, uint64 finishTime) = battle.timing();

        timing.creationTime = creationTime;
        timing.lobbyDuration = lobbyDuration;
        timing.ongoingDuration = ongoingDuration;
        timing.finishTime = finishTime;
    }

    function getSideA(address battleAddress) public view returns (address[] memory) {
        uint256 sideACount = IBattle(battleAddress).getSideALength();
        address[] memory side = new address[](sideACount);
        for (uint256 i = 0; i < sideACount; i++) {
            side[i] = IBattle(battleAddress).sideA(i);
        }

        return side;
    }

    function getSideB(address battleAddress) public view returns (address[] memory) {
        uint256 sideCount = IBattle(battleAddress).getSideBLength();
        address[] memory side = new address[](sideCount);
        for (uint256 i = 0; i < sideCount; i++) {
            side[i] = IBattle(battleAddress).sideB(i);
        }

        return side;
    }
}
