// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./ISettlementMarket.sol";
import "../WorldAsset.sol";
import "../../../libraries/ABDKMath64x64.sol";
import "../../../periphery/ProxyReentrancyGuard.sol";

contract SettlementsMarket is WorldAsset, ISettlementsMarket, ProxyReentrancyGuard {
    /// @inheritdoc ISettlementsMarket
    IZone public override currentZone;
    /// @inheritdoc ISettlementsMarket
    uint256 public override marketCreationTime;

    /// @inheritdoc ISettlementsMarket
    function init(address zoneAddress) public override initializer {
        currentZone = IZone(zoneAddress);
        marketCreationTime = block.timestamp;
    }

    /// @inheritdoc ISettlementsMarket
    function buySettlement(
        uint32 position,
        uint256 ownerTokenId,
        uint256 maxTokensToUse
    ) public payable override onlyActiveGame nonReentrant {
        uint256 gameStartTime = world().gameStartTime();
        require(gameStartTime != 0 && block.timestamp >= gameStartTime, "game is not started yet");

        address owner = world().bannerContract().ownerOf(ownerTokenId);
        require(msg.sender == owner, "nft does not belongs to you");

        IGeography geography = world().geography();
        uint16 zoneId = geography.getZoneIdByPosition(position);

        require(zoneId == currentZone.zoneId(), "position is not part of zone");

        uint256 newSettlementCost = getNewSettlementCost();
        require(maxTokensToUse >= newSettlementCost, "maxTokensToUse < newSettlementCost");

        if (address(world().blessToken()) == address(0)) {
            require(msg.value >= newSettlementCost, "insufficient value sent");
            uint256 valueToSendBack = msg.value > newSettlementCost ? msg.value - newSettlementCost : 0;

            if (valueToSendBack > 0) {
                Address.sendValue(payable(msg.sender), valueToSendBack);
            }

            Address.sendValue(payable(address(world().rewardPool())), newSettlementCost);
        } else {
            require(msg.value == 0, "unusable funds sent");
            world().blessToken().transferFrom(msg.sender, address(world().rewardPool()), newSettlementCost);
        }

        address settlementAddress = epoch().newSettlement(
            position,
            ownerTokenId,
            newSettlementCost,
            block.timestamp
        );

        emit SettlementBought(settlementAddress, newSettlementCost);
    }

    /// @inheritdoc ISettlementsMarket
    function getNewSettlementCost() public view override returns (uint256) {
        uint16 _zoneId = currentZone.zoneId();

        ICrossEpochsMemory crossEpochsMemory = world().crossEpochsMemory();
        uint256 userSettlementsCount = crossEpochsMemory.zoneUserSettlementsCount(_zoneId);
        uint256 lastPurchasePrice = crossEpochsMemory.zoneSettlementLastPrice(_zoneId);
        uint256 lastPurchaseTime = crossEpochsMemory.zoneSettlementLastPurchaseTime(_zoneId);
        uint256 lastActionTime = lastPurchaseTime == 0
            ? Math.max(marketCreationTime, world().gameStartTime())
            : lastPurchaseTime;

        uint256 newSettlementStartingPrice = userSettlementsCount == 0
            ? registry().getNewSettlementStartingPrice()
            : lastPurchasePrice + ((lastPurchasePrice / 10) * 3);

        // Case when game has start time and its not yet started
        if (lastActionTime >= block.timestamp) {
            return newSettlementStartingPrice;
        }

        uint256 secondsPassed = block.timestamp - lastActionTime;
        if (secondsPassed == 0) {
            return newSettlementStartingPrice;
        }

        uint256 hoursPassed = secondsPassed / 3600;
        uint256 nextHour = hoursPassed + 1;

        int128 hourPriceDrop64 = ABDKMath64x64.sub(
            ABDKMath64x64.fromUInt(1),
            ABDKMath64x64.div(
                ABDKMath64x64.divu(75, 100),
                ABDKMath64x64.pow(ABDKMath64x64.divu(13, 10), userSettlementsCount)
            )
        );

        int128 closestHourPriceDrop64 = ABDKMath64x64.pow(hourPriceDrop64, hoursPassed);
        int128 nextHourPriceDrop64 = ABDKMath64x64.pow(hourPriceDrop64, nextHour);
        int128 currentHourPercentPassed = ABDKMath64x64.divu(secondsPassed % 3600, 3600);

        int128 priceDrop64 = ABDKMath64x64.sub(
            closestHourPriceDrop64,
            ABDKMath64x64.mul(ABDKMath64x64.sub(closestHourPriceDrop64, nextHourPriceDrop64), currentHourPercentPassed)
        );

        return uint256(ABDKMath64x64.muli(priceDrop64, int256(newSettlementStartingPrice)));
    }
}
