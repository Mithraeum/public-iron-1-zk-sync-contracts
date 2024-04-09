// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../../../token/IERC20Burnable.sol";

/// @title Workers interface
/// @notice Functions to read state/modify state in order to get current unit parameters and/or interact with it
interface IWorkers is IERC20Burnable, IERC20 {
    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    function init() external;

    /// @notice Mints workers to specified address
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param to Address which will receive workers
    /// @param amount Amount of units to mint
    function mint(address to, uint256 amount) external;
}
