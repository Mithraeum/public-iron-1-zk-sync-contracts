// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Prosperity.sol";
import "./IProsperityFactory.sol";
import "../../WorldAssetFactory.sol";

contract ProsperityFactory is IProsperityFactory, WorldAssetFactory {
    /// @inheritdoc IProsperityFactory
    function create(
        address worldAddress,
        uint256 epochNumber
    ) public returns (address) {
        IProsperity prosperity = IProsperity(
            createAndSet(worldAddress, epochNumber, "prosperity", "BASIC")
        );

        prosperity.init();
        return address(prosperity);
    }
}
