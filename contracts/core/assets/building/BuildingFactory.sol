// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IBuilding.sol";
import "../WorldAssetFactory.sol";
import "./IBuildingFactory.sol";

contract BuildingFactory is IBuildingFactory, WorldAssetFactory {
    /// @inheritdoc IBuildingFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        address settlementAddress
    ) public returns (address) {
        IBuilding building = IBuilding(createAndSet(worldAddress, epochNumber, "building", assetName));
        building.init(settlementAddress);
        return address(building);
    }
}
