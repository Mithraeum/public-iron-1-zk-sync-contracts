// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Units factory interface
/// @notice Contains instance creator function
interface IUnitsFactory {
    /// @notice Creates Unit instance and initializes it with specified parameters
    /// @dev Even though this function is opened, it can only be called by world or world asset
    /// @param worldAddress World address
    /// @param epochNumber World epoch at which units will be created
    /// @param tokenName Name of the token
    /// @param tokenSymbol Symbol of the token
    /// @param worldUnitName Resource name in world configuration (WARRIOR/ARCHER/HORSEMAN)
    /// @return createdInstanceAddress Created instance address
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory tokenName,
        string memory tokenSymbol,
        string memory worldUnitName
    ) external returns (address createdInstanceAddress);
}
