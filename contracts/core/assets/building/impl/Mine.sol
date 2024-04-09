// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../Building.sol";

contract Mine is Building {
    /// @inheritdoc IBuilding
    function getConfig() public view override returns (InitialResourceBlock[] memory initialResourceBlocks) {
        initialResourceBlocks = new InitialResourceBlock[](3);

        initialResourceBlocks[0] = InitialResourceBlock({
            resourceName: "FOOD",
            perTick: uint256(10e18) / (1 days) / 10000,
            isProducing: false
        });

        initialResourceBlocks[1] = InitialResourceBlock({
            resourceName: "WOOD",
            perTick: uint256(10e18) / (1 days) / 10000,
            isProducing: false
        });

        initialResourceBlocks[2] = InitialResourceBlock({
            resourceName: "ORE",
            perTick: uint256(10e18) / (1 days) / 10000,
            isProducing: true
        });

        return initialResourceBlocks;
    }
}
