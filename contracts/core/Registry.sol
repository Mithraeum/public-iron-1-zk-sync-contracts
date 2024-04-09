// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./IRegistry.sol";

contract Registry is IRegistry, Initializable {
    /// @inheritdoc IRegistry
    address public override mightyCreator;
    /// @inheritdoc IRegistry
    mapping(address => bool) public override isFactoryContract;
    /// @inheritdoc IRegistry
    mapping(bytes32 => address) public override factoryContracts;
    /// @inheritdoc IRegistry
    mapping(bytes32 => address) public override implementations;
    /// @inheritdoc IRegistry
    mapping(string => UnitStats) public override unitsStats;
    /// @inheritdoc IRegistry
    uint256 public override globalMultiplier;
    /// @inheritdoc IRegistry
    uint256 public override settlementStartingPrice;

    /// @dev Allows caller to be only mighty creator
    modifier onlyMightyCreator() {
        require(msg.sender == mightyCreator, "onlyMightyCreator");
        _;
    }

    /// @inheritdoc IRegistry
    function init(
        uint256 _globalMultiplier,
        uint256 _settlementStartingPrice
    ) public override initializer {
        mightyCreator = msg.sender;
        globalMultiplier = _globalMultiplier;
        settlementStartingPrice = _settlementStartingPrice;
    }

    /// @inheritdoc IRegistry
    function setFactoryContracts(
        bytes32[] calldata groupId,
        address[] calldata factoryAddresses
    ) public override onlyMightyCreator {
        require(groupId.length == factoryAddresses.length, "invalid input");

        for (uint256 i = 0; i < groupId.length; i++) {
            factoryContracts[groupId[i]] = factoryAddresses[i];
            isFactoryContract[factoryAddresses[i]] = true;
        }
    }

    /// @inheritdoc IRegistry
    function setImplementations(
        bytes32[] calldata assetIds,
        address[] calldata implementationAddresses
    ) public override onlyMightyCreator {
        require(assetIds.length == implementationAddresses.length, "invalid input");

        for (uint256 i = 0; i < assetIds.length; i++) {
            implementations[assetIds[i]] = implementationAddresses[i];
        }
    }

    /// @inheritdoc IRegistry
    function setUnitsStats(
        string[] calldata unitTypes,
        UnitStats[] memory _unitsStats
    ) public override onlyMightyCreator {
        require(unitTypes.length == _unitsStats.length, "invalid input");

        for (uint256 i = 0; i < unitTypes.length; i++) {
            unitsStats[unitTypes[i]] = _unitsStats[i];
        }
    }

    /// @inheritdoc IRegistry
    function getGlobalMultiplier() public view override returns (uint256) {
        return globalMultiplier;
    }

    /// @inheritdoc IRegistry
    function getSiegePowerToSiegePointsMultiplier() public pure override returns (uint256) {
        return 5e18;
    }

    /// @inheritdoc IRegistry
    function getSiegePointsToResourceMultiplier(string memory resourceName) public view override returns (uint256) {
        bytes32 resourceId = keccak256(bytes(resourceName));

        if (resourceId == keccak256(bytes("FOOD"))) {
            return 1e18;
        }

        if (resourceId == keccak256(bytes("WOOD"))) {
            return 1e18;
        }

        if (resourceId == keccak256(bytes("ORE"))) {
            return 1e18;
        }

        if (resourceId == keccak256(bytes("WEAPON"))) {
            return 1e18;
        }

        revert("unknown resource");
    }

    /// @inheritdoc IRegistry
    function getWorkerCapacityCoefficient(string memory buildingName) public pure override returns (uint256) {
        bytes32 buildingId = keccak256(bytes(buildingName));

        if (buildingId == keccak256(bytes("FARM"))) {
            return 10e18;
        }

        if (buildingId == keccak256(bytes("LUMBERMILL"))) {
            return 7e18;
        }

        if (buildingId == keccak256(bytes("MINE"))) {
            return 5e18;
        }

        if (buildingId == keccak256(bytes("SMITHY"))) {
            return 3e18;
        }

        if (buildingId == keccak256(bytes("FORT"))) {
            return 5e18;
        }

        revert("unknown building");
    }

    /// @inheritdoc IRegistry
    function getBasicProductionBuildingCoefficient(string memory buildingName) public pure override returns (uint256) {
        bytes32 buildingId = keccak256(bytes(buildingName));

        if (buildingId == keccak256(bytes("FARM"))) {
            return 0.5e18;
        }

        if (buildingId == keccak256(bytes("LUMBERMILL"))) {
            return 0.35e18;
        }

        if (buildingId == keccak256(bytes("MINE"))) {
            return 0.25e18;
        }

        if (buildingId == keccak256(bytes("SMITHY"))) {
            return 0.2e18;
        }

        if (buildingId == keccak256(bytes("FORT"))) {
            return 0.2e18;
        }

        revert("unknown building");
    }

    /// @inheritdoc IRegistry
    function hasStartingTreasury(string memory buildingName) public pure override returns (bool) {
//        bytes32 buildingId = keccak256(bytes(buildingName));
//        if (buildingId == keccak256(bytes("LUMBERMILL"))) {
//            return true;
//        }

        return false;
    }

    /// @inheritdoc IRegistry
    function getToxicityByResource(string memory resourceName) public pure override returns (uint256) {
        bytes32 resourceId = keccak256(bytes(resourceName));

        if (resourceId == keccak256(bytes("FOOD"))) {
            return 1e18;
        }

        if (resourceId == keccak256(bytes("WOOD"))) {
            return 2e18;
        }

        if (resourceId == keccak256(bytes("ORE"))) {
            return 4e18;
        }

        if (resourceId == keccak256(bytes("WEAPON"))) {
            return 8e18;
        }

        revert("unknown resource");
    }

    /// @inheritdoc IRegistry
    function getResourceWeight(string memory resourceName) public pure override returns (uint256) {
        bytes32 resourceId = keccak256(bytes(resourceName));

        if (resourceId == keccak256(bytes("FOOD"))) {
            return 0;
        }

        if (resourceId == keccak256(bytes("WOOD"))) {
            return 1;
        }

        if (resourceId == keccak256(bytes("ORE"))) {
            return 2;
        }

        if (resourceId == keccak256(bytes("WEAPON"))) {
            return 3;
        }

        return 0;
    }

    /// @inheritdoc IRegistry
    function getRobberyFee() public view override returns (uint256) {
        return 0.3e18;
    }

    /// @inheritdoc IRegistry
    function getToTreasuryPercent() public pure override returns (uint256) {
        return 0.9e18;
    }

    /// @inheritdoc IRegistry
    function getBaseBattleDuration() public pure override returns (uint256) {
        return 24 hours;
    }

    /// @inheritdoc IRegistry
    function getBattleLobbyDurationPercent() public pure override returns (uint256) {
        return 0.75e18;
    }

    /// @inheritdoc IRegistry
    function getBattleDurationStunMultiplier() public pure override returns (uint256) {
        return 0.25e18;
    }

    /// @inheritdoc IRegistry
    function getMovementDurationStunMultiplier() public pure override returns (uint256) {
        return 0.6e18;
    }

    /// @inheritdoc IRegistry
    function getBuildings() public pure override returns (string[] memory) {
        string[] memory buildings = new string[](5);

        buildings[0] = "FARM";
        buildings[1] = "LUMBERMILL";
        buildings[2] = "MINE";
        buildings[3] = "SMITHY";
        buildings[4] = "FORT";

        return buildings;
    }

    /// @inheritdoc IRegistry
    function getGameResources() public pure override returns (GameResource[] memory) {
        GameResource[] memory resources = new GameResource[](4);

        resources[0] = GameResource("Mithraeum Food", "mFOOD", "FOOD");
        resources[1] = GameResource("Mithraeum Wood", "mWOOD", "WOOD");
        resources[2] = GameResource("Mithraeum Ore", "mORE", "ORE");
        resources[3] = GameResource("Mithraeum Weapon", "mWEAPON", "WEAPON");

        return resources;
    }

    /// @inheritdoc IRegistry
    function getGameUnits() public pure override returns (GameUnit[] memory) {
        GameUnit[] memory units = new GameUnit[](3);

        units[0] = GameUnit("Mithraeum Warrior", "mWARRIOR", "WARRIOR");
        units[1] = GameUnit("Mithraeum Archer", "mARCHER", "ARCHER");
        units[2] = GameUnit("Mithraeum Horseman", "mHORSEMAN", "HORSEMAN");

        return units;
    }

    /// @inheritdoc IRegistry
    function getResources() public pure override returns (string[] memory) {
        string[] memory resources = new string[](4);

        resources[0] = "FOOD";
        resources[1] = "WOOD";
        resources[2] = "ORE";
        resources[3] = "WEAPON";

        return resources;
    }

    /// @inheritdoc IRegistry
    function getUnits() public pure override returns (string[] memory) {
        string[] memory units = new string[](3);

        units[0] = "WARRIOR";
        units[1] = "ARCHER";
        units[2] = "HORSEMAN";

        return units;
    }

    /// @inheritdoc IRegistry
    function getUnitHiringFortHpMultiplier() public pure override returns (uint256) {
        return 1;
    }

    /// @inheritdoc IRegistry
    function getUnitMaxFoodToSpendOnMove(string memory unitType) public pure override returns (uint256) {
        bytes32 unitId = keccak256(bytes(unitType));

        if (unitId == keccak256(bytes("WARRIOR"))) {
            return 1e18;
        }

        if (unitId == keccak256(bytes("ARCHER"))) {
            return 0.25e18;
        }

        if (unitId == keccak256(bytes("HORSEMAN"))) {
            return 0.1e18;
        }

        revert("unknown unit");
    }

    /// @inheritdoc IRegistry
    function getProsperityForDemilitarization(string memory unitType) public pure override returns (uint256) {
        bytes32 unitId = keccak256(bytes(unitType));

        if (unitId == keccak256(bytes("WARRIOR"))) {
            return 2e18;
        }

        if (unitId == keccak256(bytes("ARCHER"))) {
            return 3e18;
        }

        if (unitId == keccak256(bytes("HORSEMAN"))) {
            return 4e18;
        }

        revert("unknown unit");
    }

    /// @inheritdoc IRegistry
    function getCultistsSummonDelay() public pure override returns (uint256) {
        return 2 weeks;
    }

    /// @inheritdoc IRegistry
    function getMaxSettlementPerZone() public pure override returns (uint256) {
        return 40;
    }

    /// @inheritdoc IRegistry
    function getCultistsNoDestructionDelay() public pure override returns (uint256) {
        return 10 days;
    }

    /// @inheritdoc IRegistry
    function getCultistsPerZoneMultiplier() public pure override returns (uint256) {
        return 5000e18;
    }

    /// @inheritdoc IRegistry
    function getMaxCultistsPerZone() public pure override returns (uint256) {
        return 10000e18;
    }

    /// @inheritdoc IRegistry
    function getCultistUnitType() public pure override returns (string memory) {
        return "WARRIOR";
    }

    /// @inheritdoc IRegistry
    function getBuildingTokenTransferThresholdPercent() public pure override returns (uint256) {
        return 0.3e18;
    }

    /// @inheritdoc IRegistry
    function getNewSettlementExtraResources() public view override returns (ExtraResource[] memory) {
        ExtraResource[] memory extraResources = new ExtraResource[](0);
//        ExtraResource[] memory extraResources = new ExtraResource[](2);
//        extraResources[0] = ExtraResource("WOOD", 5e18);
//        extraResources[1] = ExtraResource("ORE", 5e18);
        return extraResources;
    }

    /// @inheritdoc IRegistry
    function getNewSettlementStartingPrice() public view override returns (uint256) {
        return settlementStartingPrice;
    }

    /// @inheritdoc IRegistry
    function getProductionTicksInSecond() public view override returns (uint256) {
        return getMaxCultistsPerZone() / 1e18;
    }

    /// @inheritdoc IRegistry
    function getDemilitarizationCooldown() public pure override returns (uint256) {
        return 2 days;
    }

    /// @inheritdoc IRegistry
    function getUnitPriceDropByUnitType(string memory unitType) public pure override returns (uint256, uint256) {
        bytes32 unitId = keccak256(bytes(unitType));

        if (unitId == keccak256(bytes("WARRIOR"))) {
            return (9999966703519269, 10000000000000000);
        }

        if (unitId == keccak256(bytes("ARCHER"))) {
            return (9999974173233430, 10000000000000000);
        }

        if (unitId == keccak256(bytes("HORSEMAN"))) {
            return (9999981189956406, 10000000000000000);
        }

        revert("unknown unit");
    }

    /// @inheritdoc IRegistry
    function getMaxAdvancedProductionTileBuff() public pure override returns (uint256) {
        return 0.7e18;
    }

    /// @inheritdoc IRegistry
    function getCaptureTileDurationPerTile() public pure override returns (uint256) {
        return 9 hours;
    }

    /// @inheritdoc IRegistry
    function getNextCaptureProsperityThreshold() public pure override returns (uint256) {
        return 1.3e18;
    }

    /// @inheritdoc IRegistry
    function getNecessaryProsperityPercentForClaimingTileCapture() public pure override returns (uint256) {
        return 0.7e18;
    }

    /// @inheritdoc IRegistry
    function getTileCaptureCancellationFee() public pure override returns (uint256) {
        return 0.25e18;
    }

    /// @inheritdoc IRegistry
    function getMaxCapturedTilesForSettlement() public pure override returns (uint256) {
        return 3;
    }

    /// @inheritdoc IRegistry
    function getAdvancedProductionTileBonusByVariation(uint8 variation) public pure override returns (string memory, uint256) {
        if (variation == 0) {
            return ("FARM", 0.2e18);
        }

        if (variation == 1) {
            return ("FARM", 0.25e18);
        }

        if (variation == 2) {
            return ("FARM", 0.3e18);
        }

        if (variation == 3) {
            return ("LUMBERMILL", 0.2e18);
        }

        if (variation == 4) {
            return ("LUMBERMILL", 0.3e18);
        }

        if (variation == 5) {
            return ("LUMBERMILL", 0.4e18);
        }

        if (variation == 6) {
            return ("MINE", 0.3e18);
        }

        if (variation == 7) {
            return ("MINE", 0.45e18);
        }

        if (variation == 8) {
            return ("MINE", 0.6e18);
        }

        if (variation == 9) {
            return ("SMITHY", 0.5e18);
        }

        if (variation == 10) {
            return ("SMITHY", 0.7e18);
        }

        if (variation == 11) {
            return ("FORT", 0.2e18);
        }

        if (variation == 12) {
            return ("FORT", 0.3e18);
        }

        if (variation == 13) {
            return ("FORT", 0.4e18);
        }

        revert("unknown variation");
    }
}
