// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../IWorld.sol";
import "./WorldAssetProxy.sol";

/// @title Abstract world asset factory
/// @notice Any world asset factory should inherit this abstract factory containing common method to create and set world asset
abstract contract WorldAssetFactory {
    /// @dev Allows caller to be only world or world asset
    modifier onlyWorldOrWorldAsset(address worldAddress, uint256 epochNumber) {
        require(
            msg.sender == worldAddress || IWorld(worldAddress).worldAssets(epochNumber, msg.sender) != bytes32(0),
            "onlyWorldAsset"
        );
        _;
    }

    /// @dev Creates new world asset with specified world asset params and adds newly created asset to the world
    function createAndSet(
        address worldAddress,
        uint256 epochNumber,
        string memory assetType,
        string memory assetName
    ) internal onlyWorldOrWorldAsset(worldAddress, epochNumber) returns (address) {
        WorldAssetProxy newProxy = new WorldAssetProxy(worldAddress, epochNumber, assetType, assetName);
        IWorld(worldAddress).addWorldAsset(epochNumber, address(newProxy), keccak256(bytes(assetType)));
        return address(newProxy);
    }
}
