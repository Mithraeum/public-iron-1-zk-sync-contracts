// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "./IZone.sol";
import "../workersPool/IWorkersPoolFactory.sol";
import "../unitsPool/IUnitsPool.sol";
import "../unitsPool/IUnitsPoolFactory.sol";
import "../settlement/ISettlementFactory.sol";
import "../../../libraries/MathExtension.sol";
import "../WorldAsset.sol";
import "../settlementsMarket/ISettlementMarketFactory.sol";

contract Zone is WorldAsset, IZone {
    /// @inheritdoc IZone
    IWorkersPool public override workersPool;
    /// @inheritdoc IZone
    mapping(string => IUnitsPool) public override unitsPools;
    /// @inheritdoc IZone
    ISettlementsMarket public override settlementsMarket;
    /// @inheritdoc IZone
    ISettlement public override cultistsSettlement;
    /// @inheritdoc IZone
    uint256 public override cultistsSummonTime;
    /// @inheritdoc IZone
    int256 public override toxicity;
    /// @inheritdoc IZone
    uint16 public override zoneId;
    /// @inheritdoc IZone
    uint256 public override lastUpdateStateTime;
    /// @inheritdoc IZone
    uint256 public override lastUpdateStateZoneTime;

    /// @dev Allows caller to be only current epoch's units
    modifier onlyEpochUnits() {
        string memory unitType = IUnits(msg.sender).worldUnitName();
        require(address(epoch().units(unitType)) == msg.sender, "onlyEpochUnits");
        _;
    }

    /// @inheritdoc IZone
    function init(uint16 _zoneId) public override initializer {
        zoneId = _zoneId;
        lastUpdateStateTime = block.timestamp;
        lastUpdateStateZoneTime = getZoneTime(block.timestamp);

        // 1. create workers pool
        IWorkersPoolFactory workersPoolFactory = IWorkersPoolFactory(registry().factoryContracts(keccak256(bytes("workersPool"))));
        address workersPoolAddress = workersPoolFactory.create(
            address(world()),
            epochNumber(),
            "BASIC",
            address(this)
        );

        workersPool = IWorkersPool(workersPoolAddress);
        emit WorkersPoolCreated(workersPoolAddress);

        // 2. create settlements market
        ISettlementsMarketFactory settlementsMarketFactory = ISettlementsMarketFactory(registry().factoryContracts(keccak256(bytes("settlementsMarket"))));
        address settlementsMarketAddress = settlementsMarketFactory.create(
            address(world()),
            epochNumber(),
            "BASIC",
            address(this)
        );

        settlementsMarket = ISettlementsMarket(settlementsMarketAddress);
        emit SettlementsMarketCreated(settlementsMarketAddress);

        // 3. create units pool
        IUnitsPoolFactory unitsPoolFactory = IUnitsPoolFactory(
            registry().factoryContracts(keccak256(bytes("unitsPool")))
        );

        string[] memory units = registry().getUnits();

        for (uint256 i = 0; i < units.length; i++) {
            string memory unitName = units[i];

            address unitsPoolAddress = unitsPoolFactory.create(
                address(world()),
                epochNumber(),
                "BASIC",
                address(this),
                unitName
            );

            unitsPools[unitName] = IUnitsPool(unitsPoolAddress);
            emit UnitsPoolCreated(unitsPoolAddress, unitName);
        }
    }

    /// @inheritdoc IZone
    function getZoneTime(uint256 timestamp) public override view returns (uint256) {
        if (timestamp == 0) {
            timestamp = block.timestamp;
        }

        uint256 gameFinishTime = world().gameFinishTime();
        if (gameFinishTime != 0) {
            timestamp = Math.min(timestamp, gameFinishTime);
        }

        if (timestamp <= lastUpdateStateTime) {
            return lastUpdateStateZoneTime;
        }

        uint256 timeDelta = timestamp - lastUpdateStateTime;
        uint256 penalty = getPenaltyFromCultists();

        return lastUpdateStateZoneTime + (timeDelta * (1e18 - penalty));
    }

    /// @inheritdoc IZone
    function updateState() public override {
        if (block.timestamp == lastUpdateStateTime) {
            return;
        }

        IArmy cultistsArmy = cultistsSettlement.army();
        IBattle cultistsBattle = cultistsArmy.battle();
        if (address(cultistsBattle) != address(0) && !cultistsBattle.isFinishedBattle() && cultistsBattle.canFinishBattle()) {
            cultistsBattle.finishBattle();
            return;
        }

        if (address(cultistsBattle) != address(0) && cultistsBattle.isFinishedBattle()) {
            (,,, uint64 battleFinishTime) = cultistsBattle.timing();
            lastUpdateStateZoneTime = getZoneTime(battleFinishTime);
            lastUpdateStateTime = battleFinishTime;
        }

        lastUpdateStateZoneTime = getZoneTime(block.timestamp);
        lastUpdateStateTime = block.timestamp;
        emit ZoneTimeChanged(lastUpdateStateTime, lastUpdateStateZoneTime);
    }

    /// @inheritdoc IZone
    function createCultists(
        uint32 cultistsPosition
    ) public override onlyWorldAssetFromSameEpoch {
        require(address(cultistsSettlement) == address(0), "Cultists already created");

        address cultistsSettlementAddress = epoch().newAssetSettlement(
            0,
            cultistsPosition,
            "CULTISTS",
            false
        );

        cultistsSettlement = ISettlement(cultistsSettlementAddress);
        mintCultists(0);
    }

    /// @inheritdoc IZone
    function buyUnitsBatch(
        address resourcesOwner,
        address settlementAddress,
        string[] memory unitNames,
        uint256[] memory unitsCount,
        uint256[] memory maxWeaponsToSell
    ) public override {
        for (uint256 i = 0; i < unitNames.length; i++) {
            unitsPools[unitNames[i]].swapWeaponsForExactUnitsByZone(
                resourcesOwner,
                msg.sender,
                settlementAddress,
                unitsCount[i],
                maxWeaponsToSell[i]
            );
        }
    }

    /// @inheritdoc IZone
    function summonCultists() public override onlyActiveGame {
        uint256 gameStartTime = world().gameStartTime();
        require(gameStartTime != 0 && block.timestamp >= gameStartTime, "game is not started yet");

        uint256 recentCultistsSummonTime = Math.max(cultistsSummonTime, gameStartTime);

        uint256 summonDelay = registry().getCultistsSummonDelay() / registry().getGlobalMultiplier();
        require(block.timestamp > recentCultistsSummonTime + summonDelay, "summon delay");

        if (toxicity <= 0) {
            mintCultists(0);
            return;
        }

        uint256 currentCultistsAmount = epoch().units(registry().getCultistUnitType()).balanceOf(address(cultistsSettlement.army()));
        uint256 maxExtraCultists = registry().getMaxCultistsPerZone() - currentCultistsAmount;

        if (currentCultistsAmount / 2 > uint256(toxicity) / 10) {
            mintCultists(0);
            return;
        }

        uint256 cultistsToSummon = Math.min(
            MathExtension.roundDownWithPrecision(uint256(toxicity) / 10 - currentCultistsAmount / 2, 1e18),
            maxExtraCultists
        );

        mintCultists(cultistsToSummon);
    }

    /// @inheritdoc IZone
    function increaseToxicity(
        address settlementAddress,
        string memory resourceName,
        uint256 value
    ) public override onlyWorldAssetFromSameEpoch {
        uint256 toxicityAmount = registry().getToxicityByResource(resourceName) * value / 1e18;
        toxicity += int256(toxicityAmount);
        emit ToxicityIncreased(settlementAddress, toxicityAmount);
    }

    /// @inheritdoc IZone
    function decreaseToxicity(
        address settlementAddress,
        string memory resourceName,
        uint256 value
    ) public override onlyWorldAssetFromSameEpoch {
        uint256 toxicityAmount = registry().getToxicityByResource(resourceName) * value / 1e18;
        toxicity -= int256(toxicityAmount);
        emit ToxicityDecreased(settlementAddress, toxicityAmount);
    }

    /// @inheritdoc IZone
    function handleCultistsSummoned(
        address cultistsArmyAddress,
        uint256 value
    ) public override onlyEpochUnits {
        cultistsSummonTime = block.timestamp;
        epoch().increaseTotalCultists(cultistsArmyAddress, value);
    }

    /// @inheritdoc IZone
    function handleCultistsDefeated(
        address cultistsArmyAddress,
        uint256 value
    ) public override onlyEpochUnits {
        epoch().decreaseTotalCultists(cultistsArmyAddress, value);
    }

    /// @inheritdoc IZone
    function getPenaltyFromCultists() public view returns (uint256) {
        uint256 cultistsCount = epoch().units(registry().getCultistUnitType()).balanceOf(address(cultistsSettlement.army()));
        uint256 penalty = cultistsCount * 1e18 / registry().getMaxCultistsPerZone();

        if (penalty > 1e18) {
            return 1e18;
        }

        return penalty;
    }

    /// @dev Mints cultists in current zone
    function mintCultists(
        uint256 value
    ) internal {
        address cultistsArmyAddress = address(cultistsSettlement.army());
        epoch().units(registry().getCultistUnitType()).mint(cultistsArmyAddress, value);
    }
}
