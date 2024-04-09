// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Battle factory interface
/// @notice Contains instance creator function
interface IBattleFactory {
    /// @notice Creates Battle instance and initializes it with specified parameters
    /// @dev Even though this function is opened, it can only be called by world or world asset
    /// @param worldAddress World address
    /// @param epochNumber Epoch number
    /// @param assetName Name of the battle type (Currently only 'BASIC')
    /// @param attackerArmyAddress Attacker army address
    /// @param attackedArmyAddress Attacked army address
    /// @return createdInstanceAddress Created instance address
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        address attackerArmyAddress,
        address attackedArmyAddress
    ) external returns (address createdInstanceAddress);
}
