// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Workers.sol";
import "./IWorkersFactory.sol";
import "../../WorldAssetFactory.sol";

contract WorkersFactory is IWorkersFactory, WorldAssetFactory {
    /// @inheritdoc IWorkersFactory
    function create(
        address worldAddress,
        uint256 epochNumber
    ) public returns (address) {
        IWorkers workers = IWorkers(
            createAndSet(worldAddress, epochNumber, "workers", "BASIC")
        );

        workers.init();
        return address(workers);
    }
}
