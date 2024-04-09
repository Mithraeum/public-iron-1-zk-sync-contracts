// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IBattle.sol";
import "../WorldAssetFactory.sol";
import "./IBattleFactory.sol";

contract BattleFactory is IBattleFactory, WorldAssetFactory {
    /// @inheritdoc IBattleFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        address attackerArmyAddress,
        address attackedArmyAddress
    ) public returns (address) {
        IBattle battle = IBattle(createAndSet(worldAddress, epochNumber, "battle", assetName));
        battle.init(attackerArmyAddress, attackedArmyAddress);
        return address(battle);
    }
}
