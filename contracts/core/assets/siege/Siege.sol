// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "./ISiege.sol";
import "../battle/IBattle.sol";
import "../building/IBuilding.sol";
import "../../../libraries/MathExtension.sol";
import "../WorldAsset.sol";

contract Siege is WorldAsset, ISiege {
    /// @inheritdoc ISiege
    ISettlement public override currentSettlement;
    /// @inheritdoc ISiege
    mapping(address => ArmyInfo) public override armyInfo;
    /// @inheritdoc ISiege
    mapping(address => mapping(string => uint256)) public override storedUnits;
    /// @inheritdoc ISiege
    uint256 public override lastUpdate;
    /// @inheritdoc ISiege
    uint256 public override pointsPerShare;

    /// @inheritdoc ISiege
    function init(address settlementAddress) public override initializer {
        currentSettlement = ISettlement(settlementAddress);
        lastUpdate = block.timestamp;
    }

    /// @inheritdoc ISiege
    function getTotalDamageLastPeriod() public view override returns (uint256) {
        return getTotalDamageByPeriod(block.timestamp - lastUpdate);
    }

    /// @inheritdoc ISiege
    function getTotalDamageByPeriod(uint256 _period) public view override returns (uint256) {
        (uint256 _power, ) = calculateTotalSiegeStats();
        return _power * (_period * registry().getGlobalMultiplier());
    }

    /// @inheritdoc ISiege
    function canLiquidate(address _armyAddress) public view override returns (bool) {
        (uint256 armyPower, ) = calculateArmySiegeStats(_armyAddress);
        return (IArmy(_armyAddress).getTotalSiegeSupport() < armyPower);
    }

    /// @inheritdoc ISiege
    function liquidate(address _armyAddress) public override {
        update();
        IArmy(_armyAddress).updateState();
        require(canLiquidate(_armyAddress), "army cannot be liquidate");
        (uint256 _power, ) = calculateTotalSiegeStats();
        require(_power > 0, "nothing to liquidate");

        string[] memory units = registry().getUnits();

        for (uint256 i = 0; i < units.length; i++) {
            string memory unitName = units[i];
            uint256 toLiquidateAmount = storedUnits[_armyAddress][unitName];

            epoch().units(unitName).burn(toLiquidateAmount);
            storedUnits[_armyAddress][unitName] = 0;

            emit Liquidated(_armyAddress, unitName, toLiquidateAmount);
        }

        armyInfo[_armyAddress].rewardDebt = 0;
        IArmy(_armyAddress).setSiege(address(0));
    }

    /// @inheritdoc ISiege
    function addUnits(string[] memory _unitsNames, uint256[] memory _unitsCount) public override onlyWorldAssetFromSameEpoch {
        ArmyInfo storage army = armyInfo[msg.sender];
        update();

        (uint256 armyPower, uint256 armyMaxSupply) = calculateArmySiegeStats(msg.sender);
        if (armyPower > 0) {
            uint256 pending = armyPower * pointsPerShare - army.rewardDebt;
            uint256 startArmyPoints = army.points;
            if (pending > 0) {
                army.points += pending;
                if (army.points > armyMaxSupply) {
                    army.points = armyMaxSupply;
                }
            }

            emit PointsReceived(msg.sender, army.points - startArmyPoints);
        }

        for (uint256 i = 0; i < _unitsNames.length; i++) {
            if (_unitsCount[i] == 0) {
                continue;
            }

            require(MathExtension.isIntegerWithPrecision(_unitsCount[i], 1e18), "startSiege: _unitsCount must be cell");

            string memory unitName = _unitsNames[i];

            IUnits units = epoch().units(unitName);
            units.transferFrom(msg.sender, address(this), _unitsCount[i]);
            storedUnits[msg.sender][unitName] += _unitsCount[i];
        }

        (armyPower, ) = calculateArmySiegeStats(msg.sender);

        require(armyPower > 0, "cannot add 0 army power");

        army.rewardDebt = armyPower * pointsPerShare;

        emit UnitsAdded(msg.sender, address(currentSettlement), _unitsNames, _unitsCount);
    }

    /// @inheritdoc ISiege
    function withdrawUnits(string[] memory _unitsNames, uint256[] memory _unitsCount) public override onlyWorldAssetFromSameEpoch {
        update();

        ArmyInfo storage army = armyInfo[msg.sender];
        (uint256 armyPower, uint256 armyMaxSupply) = calculateArmySiegeStats(msg.sender);
        uint256 pending = armyPower * pointsPerShare - army.rewardDebt;

        //down
        if (pending > 0) {
            uint256 startArmyPoints = army.points;
            army.points += pending;
            if (army.points > armyMaxSupply) {
                army.points = armyMaxSupply;
            }

            emit PointsReceived(msg.sender, army.points - startArmyPoints);
        }

        //up

        for (uint256 i = 0; i < _unitsNames.length; i++) {
            if (_unitsCount[i] == 0) {
                continue;
            }

            require(MathExtension.isIntegerWithPrecision(_unitsCount[i], 1e18), "withdrawUnits: _unitsCount must be cell");

            string memory unitName = _unitsNames[i];

            IUnits units = epoch().units(unitName);
            require(storedUnits[msg.sender][unitName] >= _unitsCount[i], "not enough units to withdraw");
            storedUnits[msg.sender][unitName] -= _unitsCount[i];
            units.transferFrom(address(this), msg.sender, _unitsCount[i]);
        }

        (armyPower, armyMaxSupply) = calculateArmySiegeStats(msg.sender);
        if (army.points > armyMaxSupply) {
            army.points = armyMaxSupply;
        }

        army.rewardDebt = armyPower * pointsPerShare;

        if (armyPower == 0) {
            IArmy(msg.sender).setSiege(address(0));
        }

        emit UnitsWithdrawn(msg.sender, address(currentSettlement), _unitsNames, _unitsCount);
    }

    /// @inheritdoc ISiege
    function calculateTotalSiegeStats() public view override returns (uint256 _power, uint256 _supply) {
        string[] memory units = registry().getUnits();

        uint256 totalUnitsCount = units.length;
        uint256[] memory unitsCount = new uint256[](totalUnitsCount);

        for (uint256 i = 0; i < totalUnitsCount; i++) {
            string memory unitName = units[i];
            IUnits units = epoch().units(unitName);
            unitsCount[i] = units.balanceOf(address(this));
        }

        return calculateSiegeStats(unitsCount);
    }

    /// @inheritdoc ISiege
    function calculateArmySiegeStats(address _armyAddress) public view override returns (uint256 _power, uint256 _supply) {
        string[] memory units = registry().getUnits();

        uint256 totalUnitsCount = units.length;

        uint256[] memory unitsCount = new uint256[](totalUnitsCount);

        for (uint256 i = 0; i < totalUnitsCount; i++) {
            string memory unitName = units[i];
            unitsCount[i] = storedUnits[_armyAddress][unitName];
        }

        return calculateSiegeStats(unitsCount);
    }

    /// @dev Calculates siege stats for specified unitsCount
    function calculateSiegeStats(uint256[] memory _unitsCount) internal view returns (uint256 power_, uint256 supply_) {
        string[] memory units = registry().getUnits();

        for (uint256 i = 0; i < _unitsCount.length; i++) {
            if (_unitsCount[i] == 0) {
                continue;
            }

            string memory unitName = units[i];

            (
                uint256 weaponPowerStage1,
                uint256 armourPowerStage1,
                uint256 weaponPowerStage2,
                uint256 armourPowerStage2,
                uint256 siegePower,
                uint256 siegeMaxSupply,
                uint256 siegeSupport
            ) = registry().unitsStats(unitName);

            power_ += (_unitsCount[i] * siegePower) / 1e18;
            supply_ += (_unitsCount[i] * siegeMaxSupply) / 1e18;
        }

        return (power_, supply_);
    }

    /// @inheritdoc ISiege
    function update() public override {
        currentSettlement.updateCurrentHealth();
    }

    /// @inheritdoc ISiege
    function systemUpdate(uint256 _totalDamage) public override onlyWorldAssetFromSameEpoch {
        lastUpdate = block.timestamp;

        (uint256 _power, ) = calculateTotalSiegeStats();

        if (_power == 0) {
            return;
        }

        pointsPerShare += ((_totalDamage * registry().getSiegePowerToSiegePointsMultiplier()) / 1e18) / _power;
    }

    /// @inheritdoc ISiege
    function getUserPoints(address _armyAddress) public view override returns (uint256) {
        return getUserPointsOnTime(_armyAddress, block.timestamp);
    }

    /// @inheritdoc ISiege
    function getUserPointsOnTime(address _armyAddress, uint256 timestamp) public view override returns (uint256) {
        ArmyInfo storage army = armyInfo[_armyAddress];
        (uint256 armyPower, uint256 armyMaxSupply) = calculateArmySiegeStats(_armyAddress);

        (, uint256 damage) = currentSettlement.calculateCurrentHealthAndDamage(timestamp);

        (uint256 _power, ) = calculateTotalSiegeStats();
        if (_power == 0) {
            return 0;
        }

        uint256 _points = armyPower * pointsPerShare +
            (armyPower * (damage * registry().getSiegePowerToSiegePointsMultiplier()) / 1e18) /
            _power;

        return Math.min(_points - army.rewardDebt + army.points, armyMaxSupply);
    }

    /// @inheritdoc ISiege
    function claimResources(address buildingAddress, uint256 _points) public override onlyWorldAssetFromSameEpoch {
        string[] memory empty;
        uint256[] memory uintEmpty;
        withdrawUnits(empty, uintEmpty);

        IArmy army = IArmy(msg.sender);
        ArmyInfo storage armyInfo = armyInfo[msg.sender];

        require(buildingAddress != address(0), "claimResources: building address is 0");
        require(armyInfo.points >= _points, "not enough points");

        IBuilding producingResourceBuilding = IBuilding(buildingAddress);

        address targetSettlement = address(epoch().settlements(army.getCurrentPosition()));
        require(targetSettlement == address(producingResourceBuilding.currentSettlement()), "invalid settlement");

        uint256 multiplier = registry().getSiegePointsToResourceMultiplier(
            producingResourceBuilding.getProducingResourceName()
        );
        uint256 resourcesGain = (_points * multiplier) / 1e18;

        producingResourceBuilding.updateState();

        army.currentSettlement().currentZone().increaseToxicity(
            address(army.currentSettlement()),
            producingResourceBuilding.getProducingResourceName(),
            resourcesGain
        );

        uint256 amountOfStolenAndBurnedResources = producingResourceBuilding.stealTreasury(army.getOwner(), resourcesGain);
        require(amountOfStolenAndBurnedResources > 0, "nothing to stolen or burned");

        uint256 pointsSpent = (amountOfStolenAndBurnedResources * 1e18) / multiplier;
        require(pointsSpent > 0, "nothing to claim");

        armyInfo.points = armyInfo.points - pointsSpent;

        emit PointsSpent(msg.sender, pointsSpent);
    }

    /// @inheritdoc ISiege
    function getStoredUnits(address _armyAddress) public view override returns (uint256[] memory res) {
        string[] memory units = registry().getUnits();

        uint256 totalUnitsCount = units.length;
        res = new uint256[](totalUnitsCount);

        for (uint256 i = 0; i < totalUnitsCount; i++) {
            string memory unitName = units[i];

            res[i] = storedUnits[_armyAddress][unitName];
        }

        return res;
    }
}
