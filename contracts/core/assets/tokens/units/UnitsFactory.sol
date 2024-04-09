// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Units.sol";
import "./IUnitsFactory.sol";
import "../../WorldAssetFactory.sol";

contract UnitsFactory is IUnitsFactory, WorldAssetFactory {
    /// @inheritdoc IUnitsFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory tokenName,
        string memory tokenSymbol,
        string memory worldUnitName
    ) public returns (address) {
        IUnits resource = IUnits(
            createAndSet(worldAddress, epochNumber, "units", "BASIC")
        );

        resource.init(tokenName, tokenSymbol, worldUnitName);
        return address(resource);
    }
}
