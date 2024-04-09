// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IWorkersPool.sol";
import "../WorldAssetFactory.sol";
import "./IWorkersPoolFactory.sol";

contract WorkersPoolFactory is IWorkersPoolFactory, WorldAssetFactory {
    /// @inheritdoc IWorkersPoolFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        address zoneAddress
    ) public returns (address) {
        IWorkersPool workersPool = IWorkersPool(createAndSet(worldAddress, epochNumber, "workersPool", assetName));
        workersPool.init(zoneAddress);
        return address(workersPool);
    }
}
