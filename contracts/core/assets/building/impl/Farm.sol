// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../Building.sol";

contract Farm is Building {
    /// @inheritdoc Building
    function getConfig() public view override returns (InitialResourceBlock[] memory initialResourceBlocks) {
        initialResourceBlocks = new InitialResourceBlock[](1);

        initialResourceBlocks[0] = InitialResourceBlock({
            resourceName: "FOOD",
            perTick: uint256(10e18) / (1 days) / 10000,
            isProducing: true
        });

        return initialResourceBlocks;
    }

    /// @inheritdoc Building
    function updateProsperity() internal virtual override {
        return;
    }
}
