// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../zone/IZone.sol";

/// @title Zone settlements market interface
/// @notice Functions to read state/modify state in order to buy settlement
interface ISettlementsMarket {
    /// @notice Emitted when #buySettlement is called
    /// @param settlementAddress Settlement address
    /// @param settlementCost Settlement cost
    event SettlementBought(address settlementAddress, uint256 settlementCost);

    // State variables

    /// @notice Zone to which this market belongs
    /// @dev Immutable, initialized on the market creation
    function currentZone() external view returns (IZone);

    /// @notice Time at which market was created
    /// @dev Immutable, initialized on the market creation
    function marketCreationTime() external view returns (uint256);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param zoneAddress Zone address
    function init(
        address zoneAddress
    ) external;

    /// @notice Buys settlement in zone
    /// @dev Tokens will be deducted from msg.sender
    /// @param position Position
    /// @param ownerTokenId MithraeumBanners token id which will represent to which settlement will be attached to
    /// @param maxTokensToUse Maximum amount of tokens to be withdrawn for settlement
    function buySettlement(
        uint32 position,
        uint256 ownerTokenId,
        uint256 maxTokensToUse
    ) external payable;

    /// @notice Returns amount of tokens new settlement will cost
    /// @dev Calculates cost of placing new settlement in tokens
    /// @return cost Amount of tokens new settlement will cost
    function getNewSettlementCost() external view returns (uint256 cost);
}
