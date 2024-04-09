// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../../../token/IERC20Burnable.sol";

/// @title Units interface
/// @notice Functions to read state/modify state in order to get current unit parameters and/or interact with it
interface IUnits is IERC20Burnable, IERC20 {
    // State variables

    /// @notice Token name
    /// @dev Immutable, initialized on creation
    function tokenName() external returns (string memory);

    /// @notice Token symbol
    /// @dev Immutable, initialized on creation
    function tokenSymbol() external returns (string memory);

    /// @notice Name of the unit inside epoch.units
    /// @dev Immutable, initialized on creation
    function worldUnitName() external returns (string memory);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param tokenName Token name
    /// @param tokenSymbol Token symbol
    /// @param worldUnitsName World units name
    function init(
        string memory tokenName,
        string memory tokenSymbol,
        string memory worldUnitsName
    ) external;

    /// @notice Mints units to specified address
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param to Address which will receive units
    /// @param amount Amount of units to mint
    function mint(address to, uint256 amount) external;
}
