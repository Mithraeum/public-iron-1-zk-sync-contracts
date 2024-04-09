// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Settlement factory interface
/// @notice Contains instance creator function
interface ISettlementFactory {
    /// @notice Creates Settlement instance and initializes it with specified parameters
    /// @dev Even though this function is opened, it can only be called by world or world asset
    /// @param worldAddress World address
    /// @param epochNumber Epoch number
    /// @param assetName Name of the settlement type (Currently only 'BASIC' and 'CULTISTS')
    /// @param ownerTokenId Id of the banner settlement will attach to
    /// @param zoneAddress Address of the zone where settlement will be created
    /// @param settlementPosition Position on which settlement is created
    /// @return createdInstanceAddress Created instance address
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        uint256 ownerTokenId,
        address zoneAddress,
        uint32 settlementPosition
    ) external returns (address createdInstanceAddress);
}
