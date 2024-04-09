// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../WorldAssetFactory.sol";
import "./IEpochFactory.sol";
import "./IEpoch.sol";

contract EpochFactory is IEpochFactory, WorldAssetFactory {
    /// @inheritdoc IEpochFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName
    ) public returns (address) {
        IEpoch epoch = IEpoch(createAndSet(worldAddress, epochNumber, "epoch", assetName));
        epoch.init(epochNumber);
        return address(epoch);
    }
}
