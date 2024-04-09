// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Tile capturing system factory interface
/// @notice Contains instance creator function
interface ITileCapturingSystemFactory {
    /// @notice Creates Tile capturing system instance and initializes it with specified parameters
    /// @dev Even though this function is opened, it can only be called by world or world asset
    /// @param worldAddress World address
    /// @param epochNumber Epoch number
    /// @param assetName Name of the tile capturing system type (Currently only 'BASIC')
    /// @return createdInstanceAddress Created instance address
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName
    ) external returns (address createdInstanceAddress);
}
