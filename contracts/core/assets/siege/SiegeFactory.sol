// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ISiege.sol";
import "../WorldAssetFactory.sol";
import "./ISiegeFactory.sol";

contract SiegeFactory is ISiegeFactory, WorldAssetFactory {
    /// @inheritdoc ISiegeFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        address settlementAddress
    ) public returns (address) {
        ISiege siege = ISiege(createAndSet(worldAddress, epochNumber, "siege", assetName));
        siege.init(settlementAddress);
        return address(siege);
    }
}
