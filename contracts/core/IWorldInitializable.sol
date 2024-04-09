// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IWorld.sol";

/// @title Interface of the contract which will be initialized with world
/// @notice Contains access to world storage variable
interface IWorldInitializable {
    // State variables

    /// @notice World
    /// @dev Should be immutable and initialized only once
    function world() external view returns (IWorld);
}
