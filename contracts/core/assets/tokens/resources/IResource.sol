// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../../../token/IERC20Burnable.sol";

/// @title Resource interface
/// @notice Functions to read state/modify state in order to get current resource parameters and/or interact with it
interface IResource is IERC20Burnable, IERC20 {
    // State variables

    /// @notice Token name
    /// @dev Immutable, initialized on creation
    function tokenName() external returns (string memory);

    /// @notice Token symbol
    /// @dev Immutable, initialized on creation
    function tokenSymbol() external returns (string memory);

    /// @notice Name of the resource inside epoch.resources
    /// @dev Immutable, initialized on creation
    function worldResourceName() external returns (string memory);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param tokenName Token name
    /// @param tokenSymbol Token symbol
    /// @param worldResourceName World resource name
    function init(
        string memory tokenName,
        string memory tokenSymbol,
        string memory worldResourceName
    ) external;

    /// @notice Returns state balance for specified token owner
    /// @dev Current function returns value of balances 'as is', without recalculation (same as 'balanceOf' you would expect)
    /// @param tokensOwner Tokens owner
    /// @return balance Balance for token owner
    function stateBalanceOf(address tokensOwner) external view returns (uint256 balance);

    /// @notice Mints resource to specified address
    /// @dev Even though function is opened, it can only be called by world asset
    /// @param to Address which will receive resources
    /// @param amount Amount of resources to mint
    function mint(address to, uint256 amount) external;

    /// @notice Spends allowance (same as ERC20._spendAllowance)
    /// @dev Even though function is opened, it can be called only by world asset
    function spendAllowance(
        address owner,
        address spender,
        uint256 amount
    ) external;
}
