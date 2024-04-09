// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Resource.sol";
import "./IResourceFactory.sol";
import "../../WorldAssetFactory.sol";

contract ResourceFactory is IResourceFactory, WorldAssetFactory {
    /// @inheritdoc IResourceFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory tokenName,
        string memory tokenSymbol,
        string memory worldResourceName
    ) public returns (address) {
        IResource resource = IResource(
            createAndSet(worldAddress, epochNumber, "resource", "BASIC")
        );

        resource.init(tokenName, tokenSymbol, worldResourceName);
        return address(resource);
    }
}
