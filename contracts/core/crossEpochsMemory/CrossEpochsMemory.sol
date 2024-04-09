// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ICrossEpochsMemory.sol";
import "../WorldInitializable.sol";

contract CrossEpochsMemory is ICrossEpochsMemory, WorldInitializable  {
    /// @inheritdoc ICrossEpochsMemory
    mapping(uint32 => ISettlement) public override settlements;
    /// @inheritdoc ICrossEpochsMemory
    mapping(uint256 => ISettlement) public override userSettlements;
    /// @inheritdoc ICrossEpochsMemory
    mapping(uint256 => uint256) public override zoneUserSettlementsCount;
    /// @inheritdoc ICrossEpochsMemory
    mapping(uint256 => uint256) public override zoneSettlementLastPrice;
    /// @inheritdoc ICrossEpochsMemory
    mapping(uint256 => uint256) public override zoneSettlementLastPurchaseTime;

    /// @dev Allows caller to be only active world epoch
    modifier onlyActiveEpoch() {
        uint256 currentEpochNumber = world.currentEpochNumber();
        require(msg.sender == address(world.epochs(currentEpochNumber)), "onlyActiveEpoch");
        _;
    }

    /// @inheritdoc ICrossEpochsMemory
    function init(address worldAddress) public override initializer {
        setWorld(worldAddress);
    }

    /// @inheritdoc ICrossEpochsMemory
    function handleUserSettlementRestored(
        uint32 position,
        address settlementAddress
    ) public onlyActiveEpoch {
        uint256 positionOwnerTokenId = settlements[position].ownerTokenId();
        ISettlement settlement = ISettlement(settlementAddress);

        settlements[position] = settlement;
        userSettlements[positionOwnerTokenId] = settlement;
    }

    /// @inheritdoc ICrossEpochsMemory
    function handleNewUserSettlement(
        uint256 ownerTokenId,
        uint16 zoneId,
        address settlementAddress,
        uint256 settlementPrice,
        uint256 settlementPurchaseTime
    ) public onlyActiveEpoch {
        userSettlements[ownerTokenId] = ISettlement(settlementAddress);
        zoneUserSettlementsCount[zoneId]++;
        zoneSettlementLastPrice[zoneId] = settlementPrice;
        zoneSettlementLastPurchaseTime[zoneId] = settlementPurchaseTime;
    }

    /// @inheritdoc ICrossEpochsMemory
    function handleNewSettlement(
        uint32 position,
        address settlementAddress
    ) public onlyActiveEpoch {
        settlements[position] = ISettlement(settlementAddress);
    }
}
