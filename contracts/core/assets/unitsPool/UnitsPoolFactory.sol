// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../WorldAssetFactory.sol";
import "./IUnitsPool.sol";
import "./IUnitsPoolFactory.sol";

contract UnitsPoolFactory is IUnitsPoolFactory, WorldAssetFactory {
    /// @inheritdoc IUnitsPoolFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        address zoneAddress,
        string memory unitsType
    ) public returns (address) {
        IUnitsPool unitsPool = IUnitsPool(createAndSet(worldAddress, epochNumber, "unitsPool", assetName));
        unitsPool.init(zoneAddress, unitsType);
        return address(unitsPool);
    }
}
