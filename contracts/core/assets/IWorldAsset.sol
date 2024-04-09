// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../IWorld.sol";

interface IWorldAsset {
    /// @notice World
    /// @dev Value is dereferenced from proxy storage
    function world() external view returns (IWorld);

    /// @notice Registry
    /// @dev Value is dereferenced from world
    function registry() external view returns (IRegistry);

    /// @notice Epoch
    /// @dev Value is dereferenced from proxy storage and world
    function epoch() external view returns (IEpoch);
}
