// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../assets/settlement/ISettlement.sol";

/// @title Cross epoch memory interface
/// @notice Functions to read state/modify state in order to get cross epoch memory parameters and/or interact with it
interface ICrossEpochsMemory {
    // State variables

    /// @notice Mapping containing settlement by provided x and y coordinates
    /// @dev Updated when #handleNewSettlement is called
    function settlements(uint32 position) external view returns (ISettlement);

    /// @notice Mapping containing settlement address by provided banner id
    /// @dev Updated when #handleNewUserSettlement or #handleSettlementRestored is called
    function userSettlements(uint256 val) external view returns (ISettlement);

    /// @notice Mapping containing count of user settlement by provided zone id
    /// @dev Updated when #handleNewUserSettlement is called
    function zoneUserSettlementsCount(uint256 zoneId) external view returns (uint256);

    /// @notice Mapping containing settlement last price by provided zone index
    /// @dev Updated when #handleNewUserSettlement is called
    function zoneSettlementLastPrice(uint256 zoneId) external view returns (uint256);

    /// @notice Mapping containing settlement last purchase time by provided zone index
    /// @dev Updated when #handleNewUserSettlement is called
    function zoneSettlementLastPurchaseTime(uint256 zoneId) external view returns (uint256);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by address which created current instance
    /// @param worldAddress World address
    function init(address worldAddress) external;

    /// @notice Settlement restoration handler
    /// @dev Must be called by active epoch to proper persist cross epoch data
    /// @param position Position at which restoration occurred
    /// @param settlementAddress New settlement address
    function handleUserSettlementRestored(
        uint32 position,
        address settlementAddress
    ) external;

    /// @notice New user settlement handler
    /// @dev Must be called by active epoch to proper persist cross epoch data
    /// @param ownerTokenId Banners token id which will represent to which settlement will be attached to
    /// @param zoneId Zone id
    /// @param settlementAddress New settlement address
    /// @param settlementPrice Settlement price
    /// @param settlementPurchaseTime Settlement purchase time
    function handleNewUserSettlement(
        uint256 ownerTokenId,
        uint16 zoneId,
        address settlementAddress,
        uint256 settlementPrice,
        uint256 settlementPurchaseTime
    ) external;

    /// @notice New user settlement handler (including system ones, like CULTISTS)
    /// @dev Must be called by active epoch to proper persist cross epoch data
    /// @param position Position
    /// @param settlementAddress New settlement address
    function handleNewSettlement(
        uint32 position,
        address settlementAddress
    ) external;
}
