// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Zone factory interface
/// @notice Contains instance creator function
interface IZoneFactory {
    /// @notice Creates Zone instance and initializes it with specified parameters
    /// @dev Even though this function is opened, it can only be called by world or world asset
    /// @param worldAddress World address
    /// @param epochNumber Epoch number
    /// @param assetName Name of the army type (Currently only 'BASIC')
    /// @param zoneId Zone id
    /// @return createdInstanceAddress Created instance address
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        uint16 zoneId
    ) external returns (address createdInstanceAddress);
}
