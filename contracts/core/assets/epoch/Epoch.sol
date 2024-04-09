// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../zone/IZone.sol";
import "../settlement/ISettlementFactory.sol";
import "../zone/IZoneFactory.sol";
import "../WorldAsset.sol";
import "./IEpoch.sol";
import "../../geography/IGeography.sol";
import "../tokens/prosperity/IProsperityFactory.sol";
import "../tokens/workers/IWorkersFactory.sol";
import "../tokens/resources/IResourceFactory.sol";
import "../tokens/units/IUnitsFactory.sol";
import "../tileCapturingSystem/ITileCapturingSystemFactory.sol";

contract Epoch is WorldAsset, IEpoch {
    /// @inheritdoc IEpoch
    mapping(uint256 => IZone) public override zones;
    /// @inheritdoc IEpoch
    mapping(uint32 => ISettlement) public override settlements;
    /// @inheritdoc IEpoch
    uint256 public override mostRecentCultistsSummonTime;
    /// @inheritdoc IEpoch
    uint256 public override totalCultists;

    /// @inheritdoc IEpoch
    IWorkers public override workers;
    /// @inheritdoc IEpoch
    IProsperity public override prosperity;
    /// @inheritdoc IEpoch
    mapping(string => IResource) public override resources;
    /// @inheritdoc IEpoch
    mapping(string => IUnits) public override units;
    /// @inheritdoc IEpoch
    ITileCapturingSystem public override tileCapturingSystem;

    /// @inheritdoc IEpoch
    mapping(uint256 => ISettlement) public override userSettlements;

    /// @inheritdoc IEpoch
    function init(uint256 epochNumber) public override initializer {
        // 1. create new resources
        IRegistry.GameResource[] memory gameResources = registry().getGameResources();
        for (uint256 i = 0; i < gameResources.length; i++) {
            IRegistry.GameResource memory gameResource = gameResources[i];

            address resourceAddress = createNewResource(
                gameResource.tokenName,
                gameResource.tokenSymbol,
                gameResource.worldResourceName,
                epochNumber
            );

            resources[gameResource.worldResourceName] = IResource(resourceAddress);
            emit NewResource(resourceAddress, gameResource.worldResourceName);
        }

        // 2. create new units
        IRegistry.GameUnit[] memory gameUnits = registry().getGameUnits();
        for (uint256 i = 0; i < gameUnits.length; i++) {
            IRegistry.GameUnit memory gameUnit = gameUnits[i];

            address unitsAddress = createNewUnits(
                gameUnit.tokenName,
                gameUnit.tokenSymbol,
                gameUnit.worldUnitName,
                epochNumber
            );

            units[gameUnit.worldUnitName] = IUnits(unitsAddress);
            emit NewUnits(unitsAddress, gameUnit.worldUnitName);
        }

        // 3. create new workers
        address workersAddress = createNewWorkers(epochNumber);
        workers = IWorkers(workersAddress);
        emit NewWorkers(workersAddress);

        // 4. create new prosperity
        address prosperityAddress = createNewProsperity(epochNumber);
        prosperity = IProsperity(prosperityAddress);
        emit NewProsperity(prosperityAddress);

        // 5. create new tile capturing system
        address tileCapturingSystemAddress = createNewTileCapturingSystem(epochNumber);
        tileCapturingSystem = ITileCapturingSystem(tileCapturingSystemAddress);
        emit NewTileCapturingSystem(tileCapturingSystemAddress);
    }

    function createNewTileCapturingSystem(uint256 epochNumber) internal returns (address) {
        ITileCapturingSystemFactory tileCapturingSystemFactory = ITileCapturingSystemFactory(
            registry().factoryContracts(keccak256(abi.encodePacked(("tileCapturingSystem"))))
        );

        return tileCapturingSystemFactory.create(address(world()), epochNumber, "BASIC");
    }

    function createNewProsperity(uint256 epochNumber) internal returns (address) {
        IProsperityFactory prosperityFactory = IProsperityFactory(
            registry().factoryContracts(keccak256(abi.encodePacked(("prosperity"))))
        );

        return prosperityFactory.create(address(world()), epochNumber);
    }

    function createNewWorkers(uint256 epochNumber) internal returns (address) {
        IWorkersFactory workersFactory = IWorkersFactory(
            registry().factoryContracts(keccak256(abi.encodePacked(("workers"))))
        );

        return workersFactory.create(address(world()), epochNumber);
    }

    /// @dev Creates new resource instance
    function createNewResource(
        string memory resourceName,
        string memory resourceSymbol,
        string memory worldResourceName,
        uint256 epochNumber
    ) internal returns (address) {
        IResourceFactory resourceFactory = IResourceFactory(
            registry().factoryContracts(keccak256(abi.encodePacked(("resource"))))
        );

        return resourceFactory.create(address(world()), epochNumber, resourceName, resourceSymbol, worldResourceName);
    }

    /// @dev Creates new units instance
    function createNewUnits(
        string memory unitName,
        string memory unitSymbol,
        string memory worldUnitName,
        uint256 epochNumber
    ) internal returns (address) {
        IUnitsFactory unitsFactory = IUnitsFactory(registry().factoryContracts(keccak256(abi.encodePacked(("units")))));

        return unitsFactory.create(address(world()), epochNumber, unitName, unitSymbol, worldUnitName);
    }

    /// @inheritdoc IEpoch
    function activateZone(uint16 zoneId) public override {
        require(address(zones[zoneId]) == address(0), "Zone already activated");

        //2. create zone
        IZoneFactory zoneFactory = IZoneFactory(registry().factoryContracts(keccak256(bytes("zone"))));
        address zoneAddress = zoneFactory.create(
            address(world()),
            epochNumber(),
            "BASIC",
            zoneId
        );

        IZone zone = IZone(zoneAddress);
        zones[zoneId] = zone;
        emit NewZoneActivated(zoneAddress, zoneId);

        //3. creates zone cultists settlement
        zone.createCultists(world().geography().getZoneActivationParams(zoneId).cultistsPosition);
    }

    /// @inheritdoc IEpoch
    function restoreSettlement(
        uint32 position
    ) public override {
        require(epochNumber() == world().currentEpochNumber(), "settlement can be restored only in active epoch");

        ICrossEpochsMemory crossEpochsMemory = world().crossEpochsMemory();

        uint256 positionOwnerTokenId = crossEpochsMemory.settlements(position).ownerTokenId();

        address settlementAddress = this.newAssetSettlement(positionOwnerTokenId, position, "BASIC", false);
        addUserSettlement(positionOwnerTokenId, settlementAddress);
        crossEpochsMemory.handleUserSettlementRestored(position, settlementAddress);
    }

    /// @inheritdoc IEpoch
    function newSettlement(
        uint32 position,
        uint256 ownerTokenId,
        uint256 settlementPrice,
        uint256 settlementPurchaseTime
    ) public override onlyWorldAssetFromSameEpoch returns (address) {
        ICrossEpochsMemory crossEpochsMemory = world().crossEpochsMemory();

        require(address(crossEpochsMemory.userSettlements(ownerTokenId)) == address(0), "nft is bound to settlement");
        require(epochNumber() == world().currentEpochNumber(), "settlement can be placed only in active epoch");

        IGeography geography = world().geography();

        uint16 zoneId = geography.getZoneIdByPosition(position);
        IZone zone = zones[zoneId];

        require(
            crossEpochsMemory.zoneUserSettlementsCount(zoneId) < registry().getMaxSettlementPerZone(),
            "exceed max settlements per zone"
        );

        address settlementAddress = this.newAssetSettlement(ownerTokenId, position, "BASIC", true);
        addUserSettlement(ownerTokenId, settlementAddress);
        crossEpochsMemory.handleNewUserSettlement(
            ownerTokenId,
            zoneId,
            settlementAddress,
            settlementPrice,
            settlementPurchaseTime
        );
        return settlementAddress;
    }

    /// @dev Calculates does any settlement exists in provided radius
    function hasSettlementInRadius(uint32 position, uint256 radius) internal view returns (bool) {
        for (uint256 i = 1; i <= radius; i++) {
            if (hasSettlementInRingRadius(position, i)) {
                return true;
            }
        }

        return false;
    }

    /// @dev Calculates does any settlement exists in provided ring radius
    function hasSettlementInRingRadius(uint32 position, uint256 radius) internal view returns (bool) {
        IGeography geography = world().geography();
        ICrossEpochsMemory crossEpochsMemory = world().crossEpochsMemory();

        (uint32[] memory ringPositions, uint256 ringPositionsLength) = geography.getRingPositions(position, radius);
        for (uint256 i = 0; i < ringPositionsLength; i++) {
            if (address(crossEpochsMemory.settlements(ringPositions[i])) != address(0)) {
                return true;
            }
        }

        return false;
    }

    /// @dev Adds user settlement with its banner id
    function addUserSettlement(uint256 ownerTokenId, address settlementAddress) internal {
        require(address(userSettlements[ownerTokenId]) == address(0), "token already in use");
        userSettlements[ownerTokenId] = ISettlement(settlementAddress);
    }

    /// @inheritdoc IEpoch
    function newAssetSettlement(
        uint256 ownerTokenId,
        uint32 position,
        string memory assetName,
        bool performAttachmentValidation
    ) public override onlyWorldAssetFromSameEpoch returns (address) {
        IGeography geography = world().geography();
        uint16 zoneId = geography.getZoneIdByPosition(position);

        require(zoneId != 0, "cannot settle on void spot");
        require(address(settlements[position]) == address(0), "settlement on this place already exists");
        require(!hasSettlementInRadius(position, 2), "settlement in radius 2");

        if (performAttachmentValidation) {
            require(hasSettlementInRingRadius(position, 3), "no settlement in ring radius 3");
        }

        ISettlementFactory settlementFactory = ISettlementFactory(
            registry().factoryContracts(keccak256(bytes(("settlement"))))
        );

        address zoneAddress = address(zones[zoneId]);
        address settlementAddress = settlementFactory.create(
            address(world()),
            epochNumber(),
            assetName,
            ownerTokenId,
            zoneAddress,
            position
        );

        settlements[position] = ISettlement(settlementAddress);
        world().crossEpochsMemory().handleNewSettlement(position, settlementAddress);
        tileCapturingSystem.handleNewSettlement(position, settlementAddress);

        emit NewSettlement(settlementAddress, assetName, zoneAddress, position);

        return settlementAddress;
    }

    /// @inheritdoc IEpoch
    function summonCultistsBatch(uint16[] memory zoneIds) public override {
        for (uint256 i = 0; i < zoneIds.length; i++) {
            zones[zoneIds[i]].summonCultists();
        }
    }

    /// @inheritdoc IEpoch
    function increaseTotalCultists(
        address cultistsArmyAddress,
        uint256 value
    ) public override onlyWorldAssetFromSameEpoch {
        totalCultists += value;
        mostRecentCultistsSummonTime = block.timestamp;
    }

    /// @inheritdoc IEpoch
    function decreaseTotalCultists(
        address cultistsArmyAddress,
        uint256 value
    ) public override onlyWorldAssetFromSameEpoch {
        totalCultists -= value;
    }
}
