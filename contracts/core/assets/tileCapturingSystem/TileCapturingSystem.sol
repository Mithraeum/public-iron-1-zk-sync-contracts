// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "../WorldAsset.sol";
import "./ITileCapturingSystem.sol";

contract TileCapturingSystem is WorldAsset, ITileCapturingSystem {
    using EnumerableSet for EnumerableSet.UintSet;

    /// @dev Mapping containing captured tiles by provided settlement address
    mapping(address => EnumerableSet.UintSet) private settlementCapturedTiles;

    /// @inheritdoc ITileCapturingSystem
    mapping(address => uint32) public override settlementCapturingTile;
    /// @inheritdoc ITileCapturingSystem
    mapping(uint32 => TileInfo) public override tilesInfo;

    /// @dev Allows caller to be only settlement
    modifier onlySettlement {
        require(
            world().worldAssets(WorldAssetStorageAccessor.epochNumber(), msg.sender) == keccak256(bytes("settlement")),
            "onlySettlement"
        );
        _;
    }

    /// @inheritdoc ITileCapturingSystem
    function init() public override initializer {

    }

    /// @inheritdoc ITileCapturingSystem
    function beginTileCaptureBySettlement(uint32 position, uint256 prosperityStake)
        public
        override
        onlyActiveGame
        onlySettlement
    {
        // Update callers' settlement prosperity
        ISettlement(msg.sender).massUpdate();

        IGeography geography = world().geography();
        IEpoch epoch = epoch();

        require(address(epoch.zones(geography.getZoneIdByPosition(position))) != address(0), "zone must be activated first");
        require(address(world().crossEpochsMemory().settlements(position)) == address(0), "settlement occupy this position");
        require(settlementCapturingTile[msg.sender] == 0, "settlement already capturing tile");
        require(settlementCapturedTiles[msg.sender].length() < registry().getMaxCapturedTilesForSettlement(), "maximum captures reached");
        require(geography.getTileBonusByPosition(position).tileBonusType != IGeography.TileBonusType.NO_BONUS, "tile without bonus");
        require(prosperityStake > 0, "can't bid 0 prosperity");
        require(epoch.prosperity().balanceOf(msg.sender) >= prosperityStake, "not enough prosperity");

        TileInfo storage tileInfo = tilesInfo[position];
        uint256 bidToOutperform = tileInfo.usurperSettlementAddress != address(0)
            ? tileInfo.usurperProsperityStake
            : 0;

        uint256 nextMinProsperityStake = bidToOutperform * registry().getNextCaptureProsperityThreshold() / 1e18;
        require(prosperityStake >= nextMinProsperityStake, "prosperity threshold not reached");

        uint256 distanceBetweenSettlementAndTile = geography.getDistanceBetweenPositions(
            position,
            ISettlement(msg.sender).position()
        );

        uint256 captureDuration = distanceBetweenSettlementAndTile * registry().getCaptureTileDurationPerTile() / registry().getGlobalMultiplier();

        if (tileInfo.usurperSettlementAddress != address(0)) {
            settlementCapturingTile[tileInfo.usurperSettlementAddress] = 0;
        }

        tileInfo.usurperProsperityStake = prosperityStake;
        tileInfo.usurperSettlementAddress = msg.sender;
        tileInfo.usurperCaptureStartTime = block.timestamp;
        tileInfo.usurperCaptureEndTime = block.timestamp + captureDuration;

        settlementCapturingTile[msg.sender] = position;
        emit TileCapturingStarted(position, msg.sender, prosperityStake);
    }

    /// @inheritdoc ITileCapturingSystem
    function cancelTileCaptureBySettlement(uint32 position)
        public
        override
        onlyActiveGame
        onlySettlement
    {
        TileInfo storage tileInfo = tilesInfo[position];

        require(tileInfo.usurperSettlementAddress == msg.sender, "settlement is not usurper");

        // Has cancellation penalty
        if (block.timestamp < tileInfo.usurperCaptureEndTime) {
            // Update callers' settlement prosperity
            ISettlement(msg.sender).massUpdate();

            epoch().prosperity().spend(
                msg.sender,
                tileInfo.usurperProsperityStake * registry().getTileCaptureCancellationFee() / 1e18
            );
        }

        tileInfo.usurperProsperityStake = 0;
        tileInfo.usurperSettlementAddress = address(0);
        tileInfo.usurperCaptureStartTime = 0;
        tileInfo.usurperCaptureEndTime = 0;

        settlementCapturingTile[msg.sender] = 0;

        emit TileCapturingCancelled(position, msg.sender);
    }

    /// @inheritdoc ITileCapturingSystem
    function giveUpCapturedTileBySettlement(uint32 position)
        public
        override
        onlyActiveGame
        onlySettlement
    {
        TileInfo storage tileInfo = tilesInfo[position];

        require(tileInfo.ownerSettlementAddress == msg.sender, "settlement is not owner");

        removeTileBonus(position, tileInfo.ownerSettlementAddress);
        settlementCapturedTiles[msg.sender].remove(position);

        tileInfo.ownerSettlementAddress = address(0);

        emit CapturedTileGivenUp(position, msg.sender);
    }

    /// @inheritdoc ITileCapturingSystem
    function claimTileCaptureBySettlement(uint32 position)
        public
        override
        onlyActiveGame
        onlySettlement
    {
        // Update callers' settlement prosperity
        ISettlement(msg.sender).massUpdate();

        TileInfo storage tileInfo = tilesInfo[position];

        require(tileInfo.usurperSettlementAddress == msg.sender, "settlement is not usurper");
        require(block.timestamp >= tileInfo.usurperCaptureEndTime, "cannot claim yet");

        uint256 usurperProsperityStake = tileInfo.usurperProsperityStake;

        uint256 requiredProsperityForClaiming = usurperProsperityStake * registry().getNecessaryProsperityPercentForClaimingTileCapture() / 1e18;
        require(epoch().prosperity().balanceOf(msg.sender) >= requiredProsperityForClaiming, "not enough prosperity for claiming");

        if (tileInfo.ownerSettlementAddress != address(0)) {
            removeTileBonus(position, tileInfo.ownerSettlementAddress);
            settlementCapturedTiles[tileInfo.ownerSettlementAddress].remove(position);
        }

        tileInfo.ownerSettlementAddress = msg.sender;

        tileInfo.usurperProsperityStake = 0;
        tileInfo.usurperSettlementAddress = address(0);
        tileInfo.usurperCaptureStartTime = 0;
        tileInfo.usurperCaptureEndTime = 0;

        settlementCapturingTile[msg.sender] = 0;

        applyTileBonus(position, msg.sender);
        settlementCapturedTiles[msg.sender].add(position);

        emit CapturedTileClaimed(position, msg.sender, usurperProsperityStake);
    }

    /// @inheritdoc ITileCapturingSystem
    function getCapturedTilesBySettlementAddress(address settlementAddress) public view override returns (uint32[] memory) {
        uint256[] memory positions = settlementCapturedTiles[settlementAddress].values();
        uint32[] memory result = new uint32[](positions.length);
        for (uint256 i = 0; i < positions.length; i++) {
            result[i] = uint32(positions[i]);
        }

        return result;
    }

    /// @inheritdoc ITileCapturingSystem
    function handleNewSettlement(
        uint32 position,
        address settlementAddress
    ) public override onlyWorldAssetFromSameEpoch {
        IGeography.TileBonus memory tileBonus = world().geography().getTileBonusByPosition(position);
        if (tileBonus.tileBonusType == IGeography.TileBonusType.NO_BONUS) {
            return;
        }

        TileInfo storage tileInfo = tilesInfo[position];
        if (tileInfo.ownerSettlementAddress != address(0)) {
            settlementCapturedTiles[tileInfo.ownerSettlementAddress].remove(position);
            removeTileBonus(position, tileInfo.ownerSettlementAddress);
        }

        if (tileInfo.usurperSettlementAddress != address(0)) {
            settlementCapturingTile[tileInfo.usurperSettlementAddress] = 0;
        }

        tileInfo.ownerSettlementAddress = address(0);

        tileInfo.usurperProsperityStake = 0;
        tileInfo.usurperSettlementAddress = address(0);
        tileInfo.usurperCaptureStartTime = 0;
        tileInfo.usurperCaptureEndTime = 0;
    }

    /// @dev Applies tile bonus to
    function applyTileBonus(
        uint32 position,
        address settlementAddress
    ) internal {
        ISettlement settlement = ISettlement(settlementAddress);

        IGeography.TileBonus memory tileBonus = world().geography().getTileBonusByPosition(position);
        if (tileBonus.tileBonusType == IGeography.TileBonusType.ADVANCED_PRODUCTION) {
            (string memory buildingType, uint256 capacityAmount) = registry().getAdvancedProductionTileBonusByVariation(tileBonus.tileBonusVariation);
            settlement.buildings(buildingType).increaseAdditionalWorkersCapacityMultiplier(capacityAmount);
            return;
        }

        revert("unknown tile bonus");
    }

    /// @dev Removes tile bonus
    function removeTileBonus(
        uint32 position,
        address settlementAddress
    ) internal {
        ISettlement settlement = ISettlement(settlementAddress);

        IGeography.TileBonus memory tileBonus = world().geography().getTileBonusByPosition(position);
        if (tileBonus.tileBonusType == IGeography.TileBonusType.ADVANCED_PRODUCTION) {
            (string memory buildingType, uint256 capacityAmount) = registry().getAdvancedProductionTileBonusByVariation(tileBonus.tileBonusVariation);
            settlement.buildings(buildingType).decreaseAdditionalWorkersCapacityMultiplier(capacityAmount);
            return;
        }

        revert("unknown tile bonus");
    }
}
