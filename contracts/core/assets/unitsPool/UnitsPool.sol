// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "../../../libraries/MathExtension.sol";
import "../unitsPool/IUnitsPool.sol";
import "../building/impl/IFort.sol";
import "../WorldAsset.sol";
import "../../../libraries/ABDKMath64x64.sol";

contract UnitsPool is WorldAsset, IUnitsPool {
    /// @inheritdoc IUnitsPool
    IZone public override currentZone;
    /// @inheritdoc IUnitsPool
    uint256 public override lastPurchaseTime;
    /// @inheritdoc IUnitsPool
    string public override unitsType;
    /// @inheritdoc IUnitsPool
    uint256 public override startingPrice;

    /// @dev Allows caller to be only zone
    modifier onlyZone() {
        require(msg.sender == address(currentZone), "onlyZone");
        _;
    }

    /// @dev Returns weapons
    function weapons() internal view returns (IResource) {
        return epoch().resources("WEAPON");
    }

    /// @dev Returns units by pool unit type
    function units() internal view returns (IUnits) {
        return epoch().units(unitsType);
    }

    /// @inheritdoc IUnitsPool
    function init(
        address _zoneAddress,
        string memory _unitsType
    ) public override initializer {
        currentZone = IZone(_zoneAddress);
        unitsType = _unitsType;
        lastPurchaseTime = block.timestamp;
        startingPrice = 10e18;
    }

    /// @dev Calculates dropped price after last purchase time
    function getDroppedPrice() internal view returns (int128) {
        uint256 lastActionTime = Math.max(lastPurchaseTime, world().gameStartTime());
        int128 startingPrice64 = ABDKMath64x64.divu(startingPrice, 1e18);

        if (lastActionTime >= block.timestamp) {
            return startingPrice64;
        }

        uint256 secondsPassed = block.timestamp - lastActionTime;

        (uint256 numerator, uint256 denominator) = registry().getUnitPriceDropByUnitType(unitsType);
        int128 priceDropPerSecond64 = ABDKMath64x64.divu(numerator, denominator);
        int128 priceDrop64 = ABDKMath64x64.pow(priceDropPerSecond64, secondsPassed);
        return ABDKMath64x64.mul(startingPrice64, priceDrop64);
    }

    /// @dev Calculates amount of weapons and new starting price according to amount of units and price shift per unit interaction with the pool
    function calculatePriceShiftForUnits(
        uint256 amountOfUnits,
        int128 priceShiftPerUnit64
    ) internal view returns (uint256, uint256) {
        int128 droppedPrice = getDroppedPrice();
        int128 lastUnitPriceShift64 = ABDKMath64x64.pow(
            priceShiftPerUnit64,
            amountOfUnits
        );

        int128 sumOfPriceShifts64 = ABDKMath64x64.div(
            ABDKMath64x64.sub(
                lastUnitPriceShift64,
                ABDKMath64x64.fromUInt(1)
            ),
            ABDKMath64x64.ln(priceShiftPerUnit64)
        );

        int128 weaponsForPriceShift64 = ABDKMath64x64.mul(droppedPrice, sumOfPriceShifts64);
        int128 newStartingPrice64 = ABDKMath64x64.mul(droppedPrice, lastUnitPriceShift64);

        uint256 weaponsForPriceShift = uint256(ABDKMath64x64.muli(weaponsForPriceShift64, 1e18));
        uint256 newStartingPrice = uint256(ABDKMath64x64.muli(newStartingPrice64, 1e18));

        return (weaponsForPriceShift, newStartingPrice);
    }

    /// @inheritdoc IUnitsPool
    function getAmountIn(uint256 unitsToBuy) public view override returns (uint256, uint256) {
        int128 priceIncreasePerUnit64 = ABDKMath64x64.divu(1004, 1000);
        return calculatePriceShiftForUnits(unitsToBuy, priceIncreasePerUnit64);
    }

    /// @inheritdoc IUnitsPool
    function swapWeaponsForExactUnits(
        address resourcesOwner,
        address settlementAddress,
        uint256 unitsToBuy,
        uint256 maxWeaponsToSell
    ) public override returns (uint256) {
        return _swapWeaponsForExactUnits(resourcesOwner, msg.sender, settlementAddress, unitsToBuy, maxWeaponsToSell);
    }

    /// @inheritdoc IUnitsPool
    function swapWeaponsForExactUnitsByZone(
        address resourcesOwner,
        address msgSender,
        address settlementAddress,
        uint256 unitsToBuy,
        uint256 maxWeaponsToSell
    ) public override onlyZone returns (uint256) {
        return _swapWeaponsForExactUnits(resourcesOwner, msgSender, settlementAddress, unitsToBuy, maxWeaponsToSell);
    }

    /// @dev Core logic related to swapping weapons for exact units
    function _swapWeaponsForExactUnits(
        address resourcesOwner,
        address msgSender,
        address settlementAddress,
        uint256 unitsToBuy,
        uint256 maxWeaponsToSell
    ) internal returns (uint256) {
        require(unitsToBuy >= 1e18, "Insufficient units buy amount");
        require(MathExtension.isIntegerWithPrecision(unitsToBuy, 1e18), "Not integer amount of units to buy specified");
        require(maxWeaponsToSell > 0, "Insufficient maximum weapons sell amount");
        require(
            address(ISettlement(settlementAddress).currentZone()) == address(currentZone),
            "Settlement doesn't belong to this zone"
        );

        uint256 health = updateAndGetHealth(settlementAddress);
        uint256 currentUnits = updateAndGetArmyTotalUnits(settlementAddress);

        require(getMaxAllowedToBuy(health, currentUnits) >= unitsToBuy, "Exceeded limit");
        (uint256 weaponsToSell, uint256 newStartingPrice) = getAmountIn(unitsToBuy / 1e18);

        require(weaponsToSell <= maxWeaponsToSell, "Weapons to sell is more than specified limit");

        IArmy army = ISettlement(settlementAddress).army();
        army.updateState();
        (, uint64 endTime) = army.movementTiming();
        require(endTime == 0, "Can't hire units while moving");
        (, uint64 stunEndTime) = army.stunTiming();
        require(stunEndTime == 0, "stunned army cannot hire units");

        address armyAddress = address(army);

        if (resourcesOwner == address(0)) {
            weapons().burnFrom(msgSender, weaponsToSell);
        } else {
            weapons().spendAllowance(resourcesOwner, msgSender, weaponsToSell);
            weapons().burnFrom(resourcesOwner, weaponsToSell);
        }

        currentZone.decreaseToxicity(settlementAddress, "WEAPON", weaponsToSell);
        units().mint(armyAddress, unitsToBuy);

        startingPrice = newStartingPrice;
        lastPurchaseTime = block.timestamp;

        emit UnitsBought(
            msgSender,
            armyAddress,
            unitsToBuy,
            weaponsToSell
        );

        return unitsToBuy;
    }

    /// @dev Updates provided settlements fort health up to current block and returns its new value
    function updateAndGetHealth(address settlementAddress) internal returns (uint256) {
        ISettlement settlement = ISettlement(settlementAddress);
        settlement.updateCurrentHealth();
        IFort fort = IFort(address(settlement.buildings("FORT")));
        return fort.health();
    }

    /// @dev Updates provided settlements army up to current block and returns its total units count
    function updateAndGetArmyTotalUnits(address settlementAddress) internal returns (uint256 totalUnits) {
        ISettlement settlement = ISettlement(settlementAddress);
        IArmy army = settlement.army();
        army.updateState();

        require(army.isHomePosition(), "Can hire only on home position");

        ISiege siege = army.siege();
        string[] memory units = registry().getUnits();

        for (uint256 i = 0; i < units.length; i++) {
            string memory unitName = units[i];

            totalUnits += epoch().units(unitName).balanceOf(address(army));
            if (address(siege) != address(0)) {
                totalUnits += siege.storedUnits(address(army), unitName);
            }
        }
    }

    /// @dev Calculates maximum allowed extra units that can be bought and placed into army given its total units count and fort health
    function getMaxAllowedToBuy(uint256 health, uint256 currentUnits) internal returns (uint256) {
        uint256 maxAllowedUnits = MathExtension.roundDownWithPrecision(
            health / registry().getUnitHiringFortHpMultiplier(),
            1e18
        );

        if (currentUnits >= maxAllowedUnits) {
            return 0;
        }

        return maxAllowedUnits - currentUnits;
    }
}
