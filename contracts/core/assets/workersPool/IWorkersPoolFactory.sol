// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Zone workers pool factory interface
/// @notice Contains instance creator function
interface IWorkersPoolFactory {
    /// @notice Creates Zone workers pool instance and initializes it with specified parameters
    /// @dev Even though this function is opened, it can only be called by world or world asset
    /// @param worldAddress World address
    /// @param epochNumber Epoch number
    /// @param assetName Name of the pool type (Currently only 'BASIC')
    /// @param zoneAddress Zone address
    /// @return createdInstanceAddress Created instance address
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        address zoneAddress
    ) external returns (address createdInstanceAddress);
}
