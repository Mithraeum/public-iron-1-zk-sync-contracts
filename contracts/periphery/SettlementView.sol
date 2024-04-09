// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../core/assets/settlement/ISettlement.sol";

/// @title Settlement view contract
/// @notice Contains helper read/write requests for interacting with settlement
contract SettlementView {
    /// @notice Distributes all unharvested resources of all settlement buildings to its shareholders
    /// @dev Caller may pay high amount of gas if there will be a lot of shareholders. Use with caution
    /// @param settlementAddress Settlement address
    function distributeAllBuildingsUnharvestedResources(
        address settlementAddress
    ) public {
        ISettlement settlement = ISettlement(settlementAddress);
        settlement.buildings("FARM").distributeToAllShareholders();
        settlement.buildings("LUMBERMILL").distributeToAllShareholders();
        settlement.buildings("MINE").distributeToAllShareholders();
        settlement.buildings("SMITHY").distributeToAllShareholders();
    }
}
