// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../IBuilding.sol";

/// @title Fort interface
/// @notice Functions to read state/modify state in order to get current fort parameters and/or interact with it
interface IFort is IBuilding {
    // State variables

    /// @notice Fort health
    /// @dev Updated when #updateHealth is called
    function health() external view returns (uint256);

    // Functions

    /// @notice Updates fort health
    /// @dev Even though function is opened, it can be called only by world asset
    /// @param value New fort health
    function updateHealth(uint256 value) external;

    /// @notice Calculates maximum amount of health for provided level
    /// @dev Useful to determine maximum amount of health will be available at provided level
    /// @param level Level at which calculate maximum amount of health
    /// @return maxHealth Maximum amount of health for provided level
    function getMaxHealthOnLevel(uint256 level) external view returns (uint256 maxHealth);
}
