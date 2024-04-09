// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./IWorldInitializable.sol";

/// @title Abstract World initializable contract
/// @notice Any contract which should be initialized with world should inherit this contract
abstract contract WorldInitializable is IWorldInitializable, Initializable {
    /// @inheritdoc IWorldInitializable
    IWorld public override world;

    /// @dev Allows function to be callable only while game is active
    modifier onlyActiveGame() {
        uint256 gameFinishTime = world.gameFinishTime();
        require(gameFinishTime == 0 || block.timestamp < gameFinishTime, "game closed");
        _;
    }

    /// @dev Initializes world by specified address, can be called only once
    function setWorld(address worldAddress) internal onlyInitializing {
        world = IWorld(worldAddress);
    }

    /// @dev Extracts registry from the world
    function registry() internal view returns (IRegistry) {
        return world.registry();
    }
}
