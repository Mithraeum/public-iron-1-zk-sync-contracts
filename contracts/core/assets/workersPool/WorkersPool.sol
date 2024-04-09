// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "../../../libraries/MathExtension.sol";
import "./IWorkersPool.sol";
import "../settlement/ISettlement.sol";
import "../../IRegistry.sol";
import "../../IWorld.sol";
import "../zone/IZone.sol";
import "../WorldAsset.sol";
import "../../../libraries/ABDKMath64x64.sol";

contract WorkersPool is WorldAsset, IWorkersPool {
    /// @inheritdoc IWorkersPool
    IZone public override currentZone;
    /// @inheritdoc IWorkersPool
    uint256 public override lastPurchaseTime;
    /// @inheritdoc IWorkersPool
    uint256 public override startingPrice;

    /// @inheritdoc IWorkersPool
    function init(
        address zoneAddress
    ) public override initializer {
        currentZone = IZone(zoneAddress);
        lastPurchaseTime = block.timestamp;
        startingPrice = 5e18;
    }

    /// @dev Returns prosperity
    function prosperity() internal view returns (IProsperity) {
        return epoch().prosperity();
    }

    /// @dev Returns workers
    function workers() internal view returns (IWorkers) {
        return epoch().workers();
    }

    /// @dev Calculates dropped price after last purchase time
    function getDroppedPrice() internal view returns (int128) {
        uint256 lastActionTime = Math.max(lastPurchaseTime, world().gameStartTime());
        int128 startingPrice64 = ABDKMath64x64.divu(startingPrice, 1e18);

        if (lastActionTime >= block.timestamp) {
            return startingPrice64;
        }

        uint256 secondsPassed = block.timestamp - lastActionTime;

        //20% drop in 1 day (80% leftover)
        int128 priceDropPerSecond64 = ABDKMath64x64.divu(9999974173233430, 10000000000000000);
        int128 priceDrop64 = ABDKMath64x64.pow(priceDropPerSecond64, secondsPassed);
        return ABDKMath64x64.mul(startingPrice64, priceDrop64);
    }

    /// @dev Calculates amount of prosperity and new starting price according to amount of workers and price shift per worker interaction with the pool
    function calculatePriceShiftForUnits(
        uint256 amountOfWorkers,
        int128 priceShiftPerWorker64
    ) internal view returns (uint256, uint256) {
        int128 droppedPrice = getDroppedPrice();
        int128 lastWorkerPriceShift64 = ABDKMath64x64.pow(
            priceShiftPerWorker64,
            amountOfWorkers
        );

        int128 sumOfPriceShifts64 = ABDKMath64x64.div(
            ABDKMath64x64.sub(
                lastWorkerPriceShift64,
                ABDKMath64x64.fromUInt(1)
            ),
            ABDKMath64x64.ln(priceShiftPerWorker64)
        );

        int128 prosperityForPriceShift64 = ABDKMath64x64.mul(droppedPrice, sumOfPriceShifts64);
        int128 newStartingPrice64 = ABDKMath64x64.mul(droppedPrice, lastWorkerPriceShift64);

        uint256 prosperityForPriceShift = uint256(ABDKMath64x64.muli(prosperityForPriceShift64, 1e18));
        uint256 newStartingPrice = uint256(ABDKMath64x64.muli(newStartingPrice64, 1e18));

        return (prosperityForPriceShift, newStartingPrice);
    }

    /// @inheritdoc IWorkersPool
    function getAmountIn(uint256 unitsToBuy) public view override returns (uint256, uint256) {
        int128 priceIncreasePerWorker64 = ABDKMath64x64.divu(1004, 1000);
        return calculatePriceShiftForUnits(unitsToBuy, priceIncreasePerWorker64);
    }

    /// @inheritdoc IWorkersPool
    function swapProsperityForExactWorkers(
        uint256 workersToBuy,
        uint256 maxProsperityToSell
    )
        public
        override
        returns (uint256)
    {
        require(workersToBuy >= 1e18, "Insufficient workers buy amount");
        require(MathExtension.isIntegerWithPrecision(workersToBuy, 1e18), "Not integer amount of workers to buy specified");
        require(maxProsperityToSell > 0, "Insufficient maximum prosperity sell amount");

        ISettlement(msg.sender).massUpdate();

        (uint256 prosperityToSell, uint256 newStartingPrice) = getAmountIn(workersToBuy / 1e18);

        require(prosperityToSell <= maxProsperityToSell, "Prosperity to sell is more than specified limit");

        IProsperity prosperity = prosperity();
        IWorkers workers = workers();

        require(prosperity.balanceOf(msg.sender) >= prosperityToSell, "not enough amount to spend");

        prosperity.spend(msg.sender, prosperityToSell);
        workers.mint(msg.sender, workersToBuy);

        startingPrice = newStartingPrice;
        lastPurchaseTime = block.timestamp;

        emit WorkersBought(
            msg.sender,
            workersToBuy,
            prosperityToSell
        );

        return workersToBuy;
    }
}
