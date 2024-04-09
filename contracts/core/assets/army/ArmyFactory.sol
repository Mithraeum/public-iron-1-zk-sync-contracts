// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IArmy.sol";
import "../WorldAssetFactory.sol";
import "./IArmyFactory.sol";

contract ArmyFactory is IArmyFactory, WorldAssetFactory {
    /// @inheritdoc IArmyFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        address settlementAddress
    ) public returns (address) {
        IArmy army = IArmy(createAndSet(worldAddress, epochNumber, "army", assetName));
        army.init(settlementAddress);
        return address(army);
    }
}
