// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Building factory interface
/// @notice Contains instance creator function
interface IBuildingFactory {
    /// @notice Creates Building instance and initializes it with specified parameters
    /// @dev Even though this function is opened, it can only be called by world or world asset
    /// @param worldAddress World address
    /// @param epochNumber Epoch number
    /// @param assetName Name of the building type (Currently 'FARM', 'LUMBERMILL', 'MINE', 'SMITHY', 'FORT')
    /// @param settlementAddress Settlement address
    /// @return createdInstanceAddress Created instance address
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        address settlementAddress
    ) external returns (address createdInstanceAddress);
}
