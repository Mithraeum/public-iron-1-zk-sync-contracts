// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Zone settlements market factory interface
/// @notice Contains instance creator function
interface ISettlementsMarketFactory {
    /// @notice Creates Zone settlements market instance and initializes it with specified parameters
    /// @dev Even though this function is opened, it can only be called by world or world asset
    /// @param worldAddress World address
    /// @param epochNumber Epoch number
    /// @param assetName Name of the market type (Currently only 'BASIC')
    /// @param zoneAddress Zone address
    /// @return createdInstanceAddress Created instance address
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        address zoneAddress
    ) external returns (address createdInstanceAddress);
}
