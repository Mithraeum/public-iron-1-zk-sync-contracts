// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ITileCapturingSystem.sol";
import "../WorldAssetFactory.sol";
import "./ITileCapturingSystemFactory.sol";

contract TileCapturingSystemFactory is ITileCapturingSystemFactory, WorldAssetFactory {
    /// @inheritdoc ITileCapturingSystemFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName
    ) public returns (address) {
        ITileCapturingSystem tileCapturingSystem = ITileCapturingSystem(
            createAndSet(worldAddress, epochNumber, "tileCapturingSystem", assetName)
        );

        tileCapturingSystem.init();
        return address(tileCapturingSystem);
    }
}
