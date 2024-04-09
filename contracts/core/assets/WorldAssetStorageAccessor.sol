// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IWorldAssetStorageAccessor.sol";
import "./WorldAssetStorage.sol";

/// @title World asset storage accessor
/// @notice Any world asset which requires to identify itself as a specific type should inherit this contract
abstract contract WorldAssetStorageAccessor is IWorldAssetStorageAccessor {
    /// @inheritdoc IWorldAssetStorageAccessor
    function world() public view virtual override returns (IWorld) {
        return IWorld(getWorldAssetStorage().worldAddress);
    }

    /// @inheritdoc IWorldAssetStorageAccessor
    function epochNumber() public view override returns (uint256) {
        return getWorldAssetStorage().epochNumber;
    }

    /// @inheritdoc IWorldAssetStorageAccessor
    function assetGroup() public view override returns (string memory) {
        return getWorldAssetStorage().assetGroup;
    }

    /// @inheritdoc IWorldAssetStorageAccessor
    function assetType() public view override returns (string memory) {
        return getWorldAssetStorage().assetType;
    }
}
