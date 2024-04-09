// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Worker factory interface
/// @notice Contains instance creator function
interface IWorkersFactory {
    /// @notice Creates Unit instance and initializes it with specified parameters
    /// @dev Even though this function is opened, it can only be called by world or world asset
    /// @param worldAddress World address
    /// @param epochNumber World epoch at which workers will be created
    /// @return createdInstanceAddress Created instance address
    function create(
        address worldAddress,
        uint256 epochNumber
    ) external returns (address createdInstanceAddress);
}
