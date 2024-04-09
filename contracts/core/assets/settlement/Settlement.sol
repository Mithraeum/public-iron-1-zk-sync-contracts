// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "../../../libraries/MathExtension.sol";
import "../building/IBuildingFactory.sol";
import "../army/IArmyFactory.sol";
import "../siege/ISiegeFactory.sol";
import "../zone/IZone.sol";
import "./ISettlement.sol";
import "../building/impl/IFort.sol";
import "../WorldAsset.sol";

contract Settlement is WorldAsset, ISettlement {
    /// @inheritdoc ISettlement
    IZone public override currentZone;
    /// @inheritdoc ISettlement
    uint256 public override ownerTokenId;
    /// @inheritdoc ISettlement
    ISiege public override siege;
    /// @inheritdoc ISettlement
    mapping(string => IBuilding) public override buildings;
    /// @inheritdoc ISettlement
    uint256 public override currentGovernorsEpoch;
    /// @inheritdoc ISettlement
    mapping(uint256 => mapping(address => bool)) public override governors;
    /// @inheritdoc ISettlement
    IArmy public override army;
    /// @inheritdoc ISettlement
    uint256 public override extraProsperity;
    /// @inheritdoc ISettlement
    uint32 public override position;

    /// @dev Allows caller to be settlement owner or world asset
    modifier onlyOwner() {
        require(
            msg.sender == getSettlementOwner() || world().worldAssets(epochNumber(), msg.sender) != bytes32(0),
            "owner or system only"
        );
        _;
    }

    /// @dev Allows caller to be settlement ruler or world asset
    modifier onlyRulerOrWorldAsset() {
        require(isRuler(msg.sender) || world().worldAssets(epochNumber(), msg.sender) != bytes32(0), "onlyRulerOrWorldAsset");
        _;
    }

    /// @dev Transfers workers to specified address (only building is allowed)
    function transferWorkers(address _to, uint256 _amount) internal {
        require(MathExtension.isIntegerWithPrecision(_amount, 1e18), "workers can be only cell");
        require(IBuilding(_to).getWorkers() + _amount <= IBuilding(_to).getMaxAvailableForAdvancedProductionWorkers(), "settlement balance exceed limit");

        epoch().workers().transfer(_to, _amount);
    }

    /// @inheritdoc ISettlement
    function init(
        uint256 createdWithOwnerTokenId,
        address zoneAddress,
        uint32 settlementPosition
    ) public override initializer {
        currentZone = IZone(zoneAddress);
        ownerTokenId = createdWithOwnerTokenId;
        position = settlementPosition;

        createBuildings();
        createNewArmy();
        mintInitialResources();
    }

    /// @inheritdoc ISettlement
    function getSettlementOwner() public view override returns (address) {
        return world().bannerContract().ownerOf(ownerTokenId);
    }

    /// @inheritdoc ISettlement
    function newBuilding(string memory buildingName) public override onlyActiveGame returns (address) {
        require(address(buildings[buildingName]) == address(0), "building already created");

        IBuildingFactory buildingFactory = IBuildingFactory(
            registry().factoryContracts(keccak256(bytes("building")))
        );

        address newBuildingAddress = buildingFactory.create(address(world()), epochNumber(), buildingName, address(this));
        IBuilding building = IBuilding(newBuildingAddress);

        buildings[buildingName] = building;

        emit NewBuilding(newBuildingAddress, buildingName);
        return newBuildingAddress;
    }

    /// @inheritdoc ISettlement
    function accumulatedCurrentProsperity(
        uint256 timestamp
    ) public view override returns (int256) {
        if (timestamp == 0) {
            timestamp = block.timestamp;
        }

        IRegistry registry = registry();

        uint256 spentProsperity = epoch().prosperity().prosperitySpent(address(this));
        uint256 result = extraProsperity;

        IBuilding lumberMill = buildings["LUMBERMILL"];
        IBuilding mine = buildings["MINE"];
        IBuilding smithy = buildings["SMITHY"];

        result += lumberMill.getTreasury(timestamp) * registry.getResourceWeight("WOOD") / lumberMill.getBuildingCoefficient(lumberMill.getBuildingLevel());
        result += mine.getTreasury(timestamp) * registry.getResourceWeight("ORE") / mine.getBuildingCoefficient(mine.getBuildingLevel());
        result += smithy.getTreasury(timestamp) * registry.getResourceWeight("WEAPON") / smithy.getBuildingCoefficient(smithy.getBuildingLevel());

        return int256(result) - int256(spentProsperity);
    }

    /// @inheritdoc ISettlement
    function massUpdate() public override {
        buildings["FARM"].updateState();
        buildings["LUMBERMILL"].updateState();
        buildings["MINE"].updateState();
        buildings["SMITHY"].updateState();
    }

    /// @inheritdoc ISettlement
    function withdrawResources(
        string memory _resourceName,
        address _to,
        uint256 _amount
    ) public override onlyActiveGame onlyRulerOrWorldAsset {
        IResource resource = epoch().resources(_resourceName);
        uint256 resourceBalance = resource.balanceOf(address(this));
        resource.transfer(_to, Math.min(_amount, resourceBalance));
    }

    /// @inheritdoc ISettlement
    function assignResourcesAndWorkersToBuilding(
        address resourcesOwner,
        address buildingAddress,
        uint256 workersAmount,
        string[] memory resourceTypes,
        uint256[] memory resourcesAmounts
    ) public override onlyActiveGame onlyRulerOrWorldAsset {
        if (workersAmount > 0) {
            transferWorkers(buildingAddress, workersAmount);
        }

        for (uint256 i = 0; i < resourceTypes.length; i++) {
            IResource resource = epoch().resources(resourceTypes[i]);

            if (resourcesOwner == address(0)) {
                resource.transferFrom(msg.sender, buildingAddress, resourcesAmounts[i]);
            } else {
                resource.spendAllowance(resourcesOwner, msg.sender, resourcesAmounts[i]);
                resource.transferFrom(resourcesOwner, buildingAddress, resourcesAmounts[i]);
            }
        }
    }

    /// @inheritdoc ISettlement
    function updateFortHealth(uint256 _healthDiff, bool _isProduced) public override onlyWorldAssetFromSameEpoch {
        IFort fort = IFort(address(buildings["FORT"]));
        uint256 currentHealth = fort.health();

        if (_isProduced) {
            fort.updateHealth(currentHealth + _healthDiff);
            return;
        }

        if (currentHealth >= _healthDiff) {
            fort.updateHealth(currentHealth - _healthDiff);
            return;
        }

        fort.updateHealth(0);
        siege.systemUpdate(_healthDiff - currentHealth);
    }

    /// @inheritdoc ISettlement
    function updateCurrentHealth() public override {
        buildings["FORT"].updateState();
    }

    /// @inheritdoc ISettlement
    function getCurrentSiegePower() public view override returns (uint256) {
        if (address(siege) != address(0)) {
            (uint256 power, ) = siege.calculateTotalSiegeStats();
            return power * registry().getGlobalMultiplier();
        }

        return 0;
    }

    /// @inheritdoc ISettlement
    function calculateCurrentHealthAndDamage(uint256 timestamp)
        public
        view
        override
        returns (uint256 currentHealth, uint256 damage)
    {
        if (timestamp == 0) {
            timestamp = block.timestamp;
        }

        IFort fort = IFort(address(buildings["FORT"]));

        IBuilding.ProductionResultItem[] memory res = fort.getProductionResult(timestamp);

        uint256 _healthDiff;
        bool _isProduced;

        for (uint256 i = 0; i < res.length; i++) {
            if (keccak256(bytes(res[i].resourceName)) == keccak256(bytes("HEALTH"))) {
                _healthDiff = res[i].balanceChanges;
                _isProduced = res[i].isProducing;
                break;
            }
        }

        if (_healthDiff == 0) {
            return (fort.health(), 0);
        }

        if (_isProduced) {
            return (fort.health() + _healthDiff, 0);
        }

        if (fort.health() >= _healthDiff) {
            return (fort.health() - _healthDiff, 0);
        }

        return (0, _healthDiff - fort.health());
    }

    /// @notice Adds settlement governor
    /// @dev Settlement owner and other governor can add governor
    /// @param _governorAddress Address to add as the governor
    function addGovernor(address _governorAddress) public {
        require(
            msg.sender == getSettlementOwner() || governors[currentGovernorsEpoch][msg.sender],
            "only owner or governor"
        );
        governors[currentGovernorsEpoch][_governorAddress] = true;
        emit GovernorChanged(currentGovernorsEpoch, _governorAddress, true);
    }

    /// @notice Removes settlement governor
    /// @dev Only settlement owner can remove governor
    /// @param _governorAddress Address to remove from governors
    function removeGovernor(address _governorAddress) public onlyOwner {
        governors[currentGovernorsEpoch][_governorAddress] = false;
        emit GovernorChanged(currentGovernorsEpoch, _governorAddress, false);
    }

    /// @notice Removes all settlement governors
    /// @dev Only settlement owner can remove all governors
    function removeGovernors() public onlyOwner {
        currentGovernorsEpoch++;
        emit NewSettlementEpoch(currentGovernorsEpoch);
    }

    /// @inheritdoc ISettlement
    function isRuler(address _address) public view override returns (bool) {
        return getSettlementOwner() == _address || governors[currentGovernorsEpoch][_address];
    }

    /// @dev Mints initial settlement resources
    function mintInitialResources() internal {
        address settlementOwner = getSettlementOwner();

        epoch().workers().mint(address(this), 7e18);

        IRegistry.ExtraResource[] memory extraResources = registry().getNewSettlementExtraResources();
        for (uint256 i = 0; i < extraResources.length; i++) {
            epoch().resources(extraResources[i].resourceName).mint(settlementOwner, extraResources[i].value);
        }
    }

    /// @dev Creates settlements buildings
    function createBuildings() internal {
        string[] memory buildings = registry().getBuildings();
        for (uint256 i = 0; i < buildings.length; i++) {
            newBuilding(buildings[i]);
        }
    }

    /// @dev Creates settlements army
    function createNewArmy() internal {
        IArmyFactory armyFactory = IArmyFactory(registry().factoryContracts(keccak256(bytes(("army")))));
        army = IArmy(armyFactory.create(address(world()), epochNumber(), "BASIC", address(this)));
        emit NewArmy(address(army), position);
    }

    /// @inheritdoc ISettlement
    function createSiege() public override onlyActiveGame {
        require(address(siege) == address(0), "siege already created");

        ISiegeFactory siegeFactory = ISiegeFactory(registry().factoryContracts(keccak256(bytes(("siege")))));
        address newSiegeAddress = siegeFactory.create(address(world()), epochNumber(), "BASIC", address(this));
        siege = ISiege(newSiegeAddress);
        emit SiegeCreated(newSiegeAddress);
    }

    /// @notice Swaps current settlement prosperity for exact workers
    /// @dev Only ruler or world asset can perform swap
    /// @param _workersToBuy Exact amount of workers to buy
    /// @param _maxProsperityToSell Maximum amount of prosperity to spend for exact workers
    function swapProsperityForExactWorkers(uint256 _workersToBuy, uint256 _maxProsperityToSell)
        public
        onlyActiveGame
        onlyRulerOrWorldAsset
    {
        uint256 newWorkers = currentZone.workersPool().swapProsperityForExactWorkers(_workersToBuy, _maxProsperityToSell);
    }

    /// @inheritdoc ISettlement
    function extendProsperity(uint256 prosperityAmount) public override onlyActiveGame onlyWorldAssetFromSameEpoch {
        epoch().prosperity().mint(address(this), prosperityAmount);
        extraProsperity += prosperityAmount;
    }

    /// @inheritdoc ISettlement
    function beginTileCapture(uint32 position, uint256 prosperityStake) public override onlyActiveGame onlyRulerOrWorldAsset {
        epoch().tileCapturingSystem().beginTileCaptureBySettlement(position, prosperityStake);
    }

    /// @inheritdoc ISettlement
    function cancelTileCapture(uint32 position) public override onlyActiveGame onlyRulerOrWorldAsset {
        epoch().tileCapturingSystem().cancelTileCaptureBySettlement(position);
    }

    /// @inheritdoc ISettlement
    function giveUpCapturedTile(uint32 position) public override onlyActiveGame onlyRulerOrWorldAsset {
        epoch().tileCapturingSystem().giveUpCapturedTileBySettlement(position);
    }

    /// @inheritdoc ISettlement
    function claimCapturedTile(uint32 position) public override onlyActiveGame onlyRulerOrWorldAsset {
        epoch().tileCapturingSystem().claimTileCaptureBySettlement(position);
    }
}
