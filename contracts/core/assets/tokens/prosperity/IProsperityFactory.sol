// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Prosperity factory interface
/// @notice Contains instance creator function
interface IProsperityFactory {
    /// @notice Creates Resource instance and initializes it with specified parameters
    /// @dev Even though this function is opened, it can only be called by world or world asset
    /// @param worldAddress World address
    /// @param epochNumber World epoch at which prosperity will be created
    /// @return createdInstanceAddress Created instance address
    function create(
        address worldAddress,
        uint256 epochNumber
    ) external returns (address createdInstanceAddress);
}
