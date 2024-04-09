// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Resource factory interface
/// @notice Contains instance creator function
interface IResourceFactory {
    /// @notice Creates Resource instance and initializes it with specified parameters
    /// @dev Even though this function is opened, it can only be called by world or world asset
    /// @param worldAddress World address
    /// @param epochNumber Epoch number
    /// @param tokenName Name of the token
    /// @param tokenSymbol Symbol of the token
    /// @param worldResourceName Resource name in world configuration (FOOD/WOOD/ORE/WEAPON)
    /// @return createdInstanceAddress Created instance address
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory tokenName,
        string memory tokenSymbol,
        string memory worldResourceName
    ) external returns (address createdInstanceAddress);
}
