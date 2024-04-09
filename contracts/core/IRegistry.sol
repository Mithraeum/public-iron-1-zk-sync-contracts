// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/// @title Registry interface
/// @notice Functions related to current game configuration
interface IRegistry {
    struct GameResource {
        string tokenName;
        string tokenSymbol;
        string worldResourceName;
    }

    struct GameUnit {
        string tokenName;
        string tokenSymbol;
        string worldUnitName;
    }

    struct ExtraResource {
        string resourceName;
        uint256 value;
    }

    struct UnitStats {
        uint256 weaponPowerStage1;
        uint256 armourPowerStage1;
        uint256 weaponPowerStage2;
        uint256 armourPowerStage2;
        uint256 siegePower;
        uint256 siegeMaxSupply;
        uint256 siegeSupport;
    }

    // State variables

    /// @notice An address which can configure/reconfigure current game
    /// @dev Immutable, initialized on the registry creation
    function mightyCreator() external view returns (address);

    /// @notice Mapping containing is provided address a factory contract or not
    /// @dev Updated when #setFactoryContracts is called
    function isFactoryContract(address factoryAddress) external view returns (bool);

    /// @notice Mapping containing factory contracts addresses by provided asset types
    /// @dev Updated when #setFactoryContracts is called
    /// @dev During new world asset creation process registry is asked for factory contract for exact world asset type, which will contain creation method for new world asset
    function factoryContracts(bytes32 scriptId) external view returns (address);

    /// @notice Mapping containing assets implementations addresses by provided asset id
    /// @dev Updated when #setImplementations is called
    /// @dev Every worlds assets implementation (code, not data) will be defined by value from this mapping
    function implementations(bytes32 assetId) external view returns (address);

    /// @notice Mapping containing units stats by provided unit types
    /// @dev Updated when #setUnitStats is called
    function unitsStats(string memory unitName)
        external
        view
        returns (
            uint256 weaponPowerStage1,
            uint256 armourPowerStage1,
            uint256 weaponPowerStage2,
            uint256 armourPowerStage2,
            uint256 siegePower,
            uint256 siegeMaxSupply,
            uint256 siegeSupport
        );

    /// @notice Global multiplier
    /// @dev Immutable, initialized on the registry creation
    function globalMultiplier() external view returns (uint256);

    /// @notice Settlement starting price
    /// @dev Immutable, initialized on the registry creation
    function settlementStartingPrice() external view returns (uint256);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by address which created current instance
    /// @param globalMultiplier Global multiplier
    /// @param settlementStartingPrice Settlement starting price
    function init(
        uint256 globalMultiplier,
        uint256 settlementStartingPrice
    ) external;

    /// @notice Sets provided address as factory contract for provided group id
    /// @dev Even though function is opened, it can be called only by mightyCreator
    /// @param groupId Group id
    /// @param factoryAddresses Factory addresses
    function setFactoryContracts(
        bytes32[] calldata groupId,
        address[] calldata factoryAddresses
    ) external;

    /// @notice Sets provided address as implementation for provided asset ids
    /// @dev Even though function is opened, it can be called only by mightyCreator
    /// @param assetIds Asset ids
    /// @param implementationAddresses Implementation addresses
    function setImplementations(
        bytes32[] calldata assetIds,
        address[] calldata implementationAddresses
    ) external;

    /// @notice Sets units stats for provided unit types
    /// @dev Even though function is opened, it can be called only by mightyCreator
    /// @param unitTypes Unit type
    /// @param unitsStats Units stats
    function setUnitsStats(
        string[] calldata unitTypes,
        UnitStats[] memory unitsStats
    ) external;

    /// @notice Calculates worker capacity coefficient for provided building type
    /// @dev Used for internal calculation of max workers for each building
    /// @param buildingName Building type
    /// @return workerCapacityCoefficient Worker capacity coefficient
    function getWorkerCapacityCoefficient(string memory buildingName) external pure returns (uint256 workerCapacityCoefficient);

    /// @notice Calculates basic production building coefficient
    /// @dev used for internal calculation of production result
    /// @param buildingName Building type
    /// @return basicProductionBuildingCoefficient Basic production building coefficient
    function getBasicProductionBuildingCoefficient(string memory buildingName) external pure returns (uint256 basicProductionBuildingCoefficient);

    /// @notice Calculates if provided building has starting treasury on creation
    /// @dev Used for determination if treasury should be filled on settlement creation
    /// @param buildingName Building type
    /// @return hasStartingTreasury If treasury should be filled
    function hasStartingTreasury(string memory buildingName) external pure returns (bool hasStartingTreasury);

    /// @notice Calculates toxicity by resource ratio
    /// @dev Used for minting/burning toxicity
    /// @param resourceName Resource name
    /// @return toxicity Amount of toxicity per 1 resource (both are in 1e18 precision)
    function getToxicityByResource(string memory resourceName) external pure returns (uint256 toxicity);

    /// @notice Calculates resource weight
    /// @dev Used for calculation how much prosperity will be produced by resource in treasury
    /// @param resourceName Resource name
    /// @return resourceWeight Resource weight (in 1e0 precision)
    function getResourceWeight(string memory resourceName) external pure returns (uint256 resourceWeight);

    /// @notice Returns siege power to siege siege points multiplier
    /// @dev Used for determination how much siege points will be given
    /// @return siegePowerToSiegePointsMultiplier Siege power to siege siege points multiplier (in 1e18 precision)
    function getSiegePowerToSiegePointsMultiplier() external pure returns (uint256 siegePowerToSiegePointsMultiplier);

    /// @notice Returns siege point multiplier by provided resource
    /// @dev Used in calculation how many resources can be exchanged for siege points
    /// @param resourceName Resource name
    /// @return siegePointsToResourceMultiplier Siege point multiplier (in 1e18 precision)
    function getSiegePointsToResourceMultiplier(string memory resourceName) external view returns (uint256 siegePointsToResourceMultiplier);

    /// @notice Returns robbery fee
    /// @dev Used in determination how much of resource will be burned during robbery
    /// @return robberyFee Robbery fee (in 1e18 precision, where 1e18 is 100%)
    function getRobberyFee() external view returns (uint256 robberyFee);

    /// @notice Returns global multiplier
    /// @dev Used everywhere, where time is involved. Essentially determines game speed
    /// @return globalMultiplier Global multiplier
    function getGlobalMultiplier() external view returns (uint256 globalMultiplier);

    /// @notice Returns production to treasury percent
    /// @dev Determines how much of buildings production will go to treasury (if not full)
    /// @param toTreasuryPercent Production to treasury percent (in 1e18 precision, where 1e18 is 100%)
    function getToTreasuryPercent() external pure returns (uint256 toTreasuryPercent);

    /// @notice Returns base battle duration
    /// @dev Used internally to determine how long battle will last
    /// @return baseBattleDuration Base battle duration
    function getBaseBattleDuration() external view returns (uint256 baseBattleDuration);

    /// @notice Returns battle lobby phase duration percent (in 1e18 precision)
    /// @dev Used internally to determine how long lobby phase will last
    /// @return battleLobbyDurationPercent Battle lobby phase duration percent
    function getBattleLobbyDurationPercent() external view returns (uint256 battleLobbyDurationPercent);

    /// @notice Returns battle duration stun multiplier
    /// @dev Used internally to determine how long stun will last after army lost battle
    /// @return battleDurationStunMultiplier Battle duration stun multiplier
    function getBattleDurationStunMultiplier() external pure returns (uint256 battleDurationStunMultiplier);

    /// @notice Returns movement duration stun multiplier
    /// @dev Used internally to determine how long stun will last after armies' movement
    /// @return movementDurationStunMultiplier Movement duration stun multiplier
    function getMovementDurationStunMultiplier() external pure returns (uint256 movementDurationStunMultiplier);

    /// @notice Returns game buildings
    /// @dev Used internally to determine which buildings will be created on placing settlement
    /// @return buildings Buildings
    function getBuildings() external view returns (string[] memory buildings);

    /// @notice Returns game resources
    /// @dev Used internally to determine upgrade costs and providing initial resources for settlement owner based on his tier
    /// @param resources Game resources
    function getResources() external view returns (string[] memory resources);

    /// @notice Returns game units
    /// @dev Used internally in many places where interaction with units is necessary
    /// @return units Game units
    function getUnits() external view returns (string[] memory units);

    /// @notice Returns game resources
    /// @dev Used internally to determine upgrade costs and providing initial resources for settlement owner based on his tier
    /// @param resources Game resources
    function getGameResources() external view returns (GameResource[] memory resources);

    /// @notice Returns game units
    /// @dev Used internally in many places where interaction with units is necessary
    /// @return units Game units
    function getGameUnits() external view returns (GameUnit[] memory units);

    /// @notice Returns unit hiring fort hp multiplier
    /// @dev Used to determine how much units in army can be presented based on its current fort hp and this parameter
    /// @return unitHiringFortHpMultiplier Unit hiring fort hp multiplier
    function getUnitHiringFortHpMultiplier() external pure returns (uint256 unitHiringFortHpMultiplier);

    /// @notice Returns how much food unit can take from treasury to increase its army movement speed
    /// @dev Used internally to calculate army's movement speed
    /// @param unitType Unit type
    /// @return unitMaxFoodToSpendOnMove Maximum amount of food to spend on move (in 1e18 precision)
    function getUnitMaxFoodToSpendOnMove(string memory unitType) external pure returns (uint256 unitMaxFoodToSpendOnMove);

    /// @notice Returns how much prosperity will be given for provided unit type
    /// @dev Used internally to calculate how much prosperity will be given
    /// @return prosperityPerUnit Prosperity amount per one unit (in 1e18 precision)
    function getProsperityForDemilitarization(string memory unitType) external pure returns (uint256 prosperityPerUnit);

    /// @notice Returns cultists summon delay
    /// @dev Used to determine is cultists can be re-summoned
    /// @return cultistsSummonDelay Cultists summon delay (in seconds)
    function getCultistsSummonDelay() external pure returns (uint256 cultistsSummonDelay);

    /// @notice Returns max settlement that can be placed in one zone
    /// @dev Cultists does not count (so +1 with cultists)
    /// @return maxSettlementPerZone Max settlement that can be placed in one zone
    function getMaxSettlementPerZone() external pure returns (uint256 maxSettlementPerZone);

    /// @notice Returns interval duration where world is not destructible after recent cultists summon
    /// @dev Used to determine if destruction is available or not
    /// @return cultistsNoDestructionDelay No destruction interval duration (in seconds)
    function getCultistsNoDestructionDelay() external pure returns (uint256 cultistsNoDestructionDelay);

    /// @notice Returns value of cultists per zone which determines cultists threshold for world destruction
    /// @dev Used to determine amount of cultists that have to be present for world destruction
    /// @return cultistsPerZoneMultiplier Value of cultists per zone
    function getCultistsPerZoneMultiplier() external pure returns (uint256 cultistsPerZoneMultiplier);

    /// @notice Returns maximum amount of cultists that can be present in zone
    /// @dev Used to determine how many cultists will be summoned
    /// @return maxCultistsPerZone Maximum amount of cultists
    function getMaxCultistsPerZone() external pure returns (uint256 maxCultistsPerZone);

    /// @notice Returns unit type of cultists army
    /// @dev Determines type of unit in cultists army
    /// @return cultistUnitType Cultists unit type
    function getCultistUnitType() external pure returns (string memory cultistUnitType);

    /// @notice Returns building token transfer threshold percent
    /// @dev Used to determine is building token transfer allowed based on treasury percent
    /// @return buildingTokenTransferThresholdPercent Building token transfer threshold percent
    function getBuildingTokenTransferThresholdPercent() external pure returns (uint256 buildingTokenTransferThresholdPercent);

    /// @notice Returns extra resources which will be minted to user when new settlement is placed
    /// @dev During settlement creation continent contract uses output from this function to determine how much extra resources to mint
    /// @return extraResources Extra resources which will be minted to user when new settlement is placed
    function getNewSettlementExtraResources() external view returns (ExtraResource[] memory extraResources);

    /// @notice Returns new settlement starting price in settlements market
    /// @dev Used to determine how much base price for first settlement will be
    /// @return newSettlementStartingPrice New settlement starting price
    function getNewSettlementStartingPrice() external view returns (uint256 newSettlementStartingPrice);

    /// @notice Returns amount of production ticks
    /// @dev Used for production calculation
    /// @return ticks Amount of production ticks
    function getProductionTicksInSecond() external view returns (uint256 ticks);

    /// @notice Returns army demilitarization cooldown in seconds
    /// @dev Used for army demilitarization restriction
    /// @return cooldown Demilitarization cooldown in seconds
    function getDemilitarizationCooldown() external pure returns (uint256 cooldown);

    /// @notice Returns unit pool price drop per second for provided unit type, provided as numerator and denominator
    /// @dev Used for determination of current unit pool price
    /// @param unitType Unit type
    /// @return numerator Numerator
    /// @return denominator Denominator
    function getUnitPriceDropByUnitType(string memory unitType) external pure returns (uint256 numerator, uint256 denominator);

    /// @notice Returns max potential advanced production buff gain from capturing tiles
    /// @dev Used for determination advanced production multiplier
    /// @return maxAdvancedProductionTileBuff Max potential advanced production from tile buff
    function getMaxAdvancedProductionTileBuff() external pure returns (uint256 maxAdvancedProductionTileBuff);

    /// @notice Returns capture tile duration per each tile in distance from settlement to selected tile
    /// @dev Used to capture tile duration calculation
    /// @return captureTileDurationPerTile Capture tile duration per tile
    function getCaptureTileDurationPerTile() external pure returns (uint256 captureTileDurationPerTile);

    /// @notice Returns next capture prosperity threshold
    /// @dev Used to determine if new bid on captured tile is possible
    /// @return nextCaptureProsperityThreshold Next capture prosperity threshold
    function getNextCaptureProsperityThreshold() external pure returns (uint256 nextCaptureProsperityThreshold);

    /// @notice Returns percent of prosperity that has to be in settlement for claiming captured tile
    /// @dev Used to determine if tile claim is possible
    /// @return necessaryProsperityPercentForClaimingTileCapture Necessary prosperity percent for claiming tile capture
    function getNecessaryProsperityPercentForClaimingTileCapture() external pure returns (uint256 necessaryProsperityPercentForClaimingTileCapture);

    /// @notice Returns tile capture cancellation fee
    /// @dev Used to determine how much prosperity has to be given in order to cancel tile capture
    /// @return tileCaptureCancellationFee Tile capture cancellation fee
    function getTileCaptureCancellationFee() external pure returns (uint256 tileCaptureCancellationFee);

    /// @notice Returns max captured tiles for settlement
    /// @dev Used to determine whether settlement can initiate tile capture
    /// @return maxCapturedTilesForSettlement Max captured tiles for settlement
    function getMaxCapturedTilesForSettlement() external pure returns (uint256 maxCapturedTilesForSettlement);

    /// @notice Returns advanced production tile bonus by variation
    /// @dev Used to determine tile bonus by tile bonus variation
    /// @param tileBonusVariation Tile bonus variation
    function getAdvancedProductionTileBonusByVariation(uint8 tileBonusVariation) external pure returns (string memory buildingType, uint256 capacityAmountMultiplier);
}
