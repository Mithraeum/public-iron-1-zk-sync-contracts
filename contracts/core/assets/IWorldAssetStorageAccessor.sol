// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../IWorld.sol";

/// @title World asset storage accessor interface
/// @notice Contains function to identify world asset group and type
interface IWorldAssetStorageAccessor {
    // Functions

    /// @notice Returns world
    /// @dev Reads data from proxy's storage
    /// @return world World
    function world() external view returns (IWorld world);

    /// @notice Returns epoch number
    /// @dev Reads data from proxy's storage
    /// @return epochNumber Epoch number
    function epochNumber() external view returns (uint256 epochNumber);

    /// @notice Returns world asset group
    /// @dev Reads data from proxy's storage
    /// @return assetGroup World asset group
    function assetGroup() external view returns (string memory assetGroup);

    /// @notice Returns world asset type
    /// @dev Reads data from proxy's storage
    /// @return assetType World asset type
    function assetType() external view returns (string memory assetType);
}
