// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "../Building.sol";
import "./IFort.sol";

contract Fort is Building, IFort {
    /// @inheritdoc IFort
    uint256 public override health;

    /// @inheritdoc IFort
    function updateHealth(uint256 value) public onlyWorldAssetFromSameEpoch {
        uint256 maxHealth = getMaxHealthOnLevel(getBuildingLevel());
        health = Math.min(value, maxHealth);
    }

    /// @inheritdoc IBuilding
    function getProducingResourceName() public view override(Building, IBuilding) returns (string memory) {
        return "";
    }

    /// @inheritdoc IBuilding
    function resetDistribution() public override(Building, IBuilding) {
        revert("resetDistribution is disabled");
    }

    /// @inheritdoc IBuilding
    function init(address settlementAddress)
        public
        override(Building, IBuilding)
        initializer
    {
        currentSettlement = ISettlement(settlementAddress);

        basicProduction.level = 1;
        basicProduction.coefficient = 1;

        advancedProduction.level = 1;
        advancedProduction.coefficient = 1;

        production.lastUpdateStateTime = block.timestamp;
        health = 4e18;
    }

    /// @inheritdoc IBuilding
    function getConfig()
        public
        view
        override(Building, IBuilding)
        returns (InitialResourceBlock[] memory initialResourceBlocks)
    {
        initialResourceBlocks = new InitialResourceBlock[](3);

        initialResourceBlocks[0] = InitialResourceBlock({
            resourceName: "FOOD",
            perTick: uint256(3e18) / (1 days),
            isProducing: false
        });

        initialResourceBlocks[1] = InitialResourceBlock({
            resourceName: "WOOD",
            perTick: uint256(2e18) / (1 days),
            isProducing: false
        });

        initialResourceBlocks[2] = InitialResourceBlock({
            resourceName: "HEALTH",
            perTick: uint256(1e18) / (1 days),
            isProducing: true
        });

        return initialResourceBlocks;
    }

    /// @inheritdoc IFort
    function getMaxHealthOnLevel(uint256 level) public view override returns (uint256) {
        return (getBuildingCoefficient(level) ** 2) * 2 * 1e18;
    }

    /// @inheritdoc Building
    function updateProsperity() internal override {}

    /// @inheritdoc IBuilding
    function getTreasury(uint256 _timestamp) public view override(Building, IBuilding) returns (uint256) {
        return 0;
    }

    /// @inheritdoc IBuilding
    function getMaxTreasuryByLevel(uint256 _level) public view override(Building, IBuilding) returns (uint256) {
        return 0;
    }

    /// @inheritdoc IBuilding
    function getUpgradePrice(uint256 level)
        public
        view
        virtual
        override(Building, IBuilding)
        returns (uint256)
    {
        // * 5 because fort health is 5 times lower than same treasury with this level
        // if anything changes make sure to check on that
        uint256 maxHealthByLevel = getMaxHealthOnLevel(level) * 5;
        uint256 maxHealthByNextLevel = getMaxHealthOnLevel(level + 1) * 5;
        uint256 maxHealthByLevelWithCoefficient = (maxHealthByLevel * 75) / 100;
        uint256 treasuryDifference = maxHealthByNextLevel - maxHealthByLevelWithCoefficient;
        return treasuryDifference / 6;
    }

    /// @inheritdoc IBuilding
    function updateState() public override(Building, IBuilding) {
        if (production.lastUpdateStateTime == block.timestamp) {
            return;
        }

        uint256 currentTime = getCurrentTime();

        ProductionResultItem[] memory productionResult = getProductionResult(currentTime);
        production.lastUpdateStateTime = currentTime;

        for (uint256 i = 0; i < productionResult.length; i++) {
            if (keccak256(bytes(productionResult[i].resourceName)) == keccak256(bytes("HEALTH"))) {
                //health
                currentSettlement.updateFortHealth(
                    productionResult[i].balanceChanges,
                    productionResult[i].isProducing
                );
                continue;
            }

            if (productionResult[i].balanceChanges == 0) {
                continue;
            }

            epoch().resources(productionResult[i].resourceName).burn(productionResult[i].balanceChanges);
        }
    }

    struct FortData {
        uint256 fullHealthProductionSeconds;
        uint256 partialHealthProductionSeconds;
    }

    /// @dev Calculates fort advanced production
    function calculateFortAdvancedProduction(
        uint256 currentHealth,
        uint256 maxHealth,
        uint256 basicRegenIncome,
        uint256 advancedRegenIncome,
        uint256 degenIncome,
        uint256 toBeProducedValue
    ) public pure returns (FortData memory) {
        // If advanced regen = 0, no advanced production is taking place
        if (advancedRegenIncome == 0) {
            return FortData({fullHealthProductionSeconds: 0, partialHealthProductionSeconds: 0});
        }

        uint256 missingHealth = maxHealth - currentHealth;
        uint256 regenIncome = basicRegenIncome + advancedRegenIncome;
        uint256 secondsUntilResourcesDepletionWithFullSpeed = toBeProducedValue / advancedRegenIncome;

        // If degen is greater (or equal) than combined regen ->
        // advanced production is working at full speed and will stop when there will be no resources
        if (degenIncome >= regenIncome) {
            return
                FortData({
                    fullHealthProductionSeconds: secondsUntilResourcesDepletionWithFullSpeed,
                    partialHealthProductionSeconds: 0
                });
        }

        uint256 netRegen = regenIncome - degenIncome;
        uint256 secondsUntilFullWithCurrentSpeed = (missingHealth % netRegen) == 0
            ? missingHealth / netRegen
            : (missingHealth / netRegen) + 1;

        // If degen is zero -> hp can only go up and will stop when its full or there will be no resources
        if (degenIncome == 0) {
            return
                FortData({
                    fullHealthProductionSeconds: Math.min(
                        secondsUntilResourcesDepletionWithFullSpeed,
                        secondsUntilFullWithCurrentSpeed
                    ),
                    partialHealthProductionSeconds: 0
                });
        }

        // Basic regen at this point is always zero and degen is not zero

        // If resources will run out faster than we will reach full hp ->
        // advanced production is working at full speed and will be interrupted by empty resources
        if (secondsUntilResourcesDepletionWithFullSpeed <= secondsUntilFullWithCurrentSpeed) {
            return
                FortData({
                    fullHealthProductionSeconds: secondsUntilResourcesDepletionWithFullSpeed,
                    partialHealthProductionSeconds: 0
                });
        }

        // At this point we will reach full hp with current production speed meaning partial production will take place
        // and it will last until we have resources for current degen
        // or it also means
        // part of production that is left after we have reached full hp is the same as
        // amount of seconds until full subtracted from amount of seconds until depletion BUT multiplied by regen/degen ratio
        // in order to 'extend' production seconds
        // for example:
        // - we have 100 seconds until resources depletion with full speed
        // - we have 40 seconds until full with current speed
        // - we have 20 hp/s of advanced regen
        // - we have 10 hp/s of degen
        // - 100 - 40 = 60 seconds -> amount of seconds of full production speed that has to be converted to lower consumption
        // or 60 seconds * 20 hp/s = 1200hp -> amount of hp would have been produced with full speed
        // then 1200 hp / 10hp/s = 120 seconds of lowered production
        uint256 partialHealthProductionSeconds = (
            (secondsUntilResourcesDepletionWithFullSpeed - secondsUntilFullWithCurrentSpeed) * regenIncome
        ) / degenIncome;

        return
            FortData({
                fullHealthProductionSeconds: secondsUntilFullWithCurrentSpeed,
                partialHealthProductionSeconds: partialHealthProductionSeconds
            });
    }

    /// @inheritdoc IBuilding
    function getProductionResult(uint256 timestamp)
        public
        view
        virtual
        override(Building, IBuilding)
        returns (ProductionResultItem[] memory res)
    {
        if (timestamp == 0) {
            timestamp = block.timestamp;
        }

        uint256 gameFinishTime = world().gameFinishTime();
        if (gameFinishTime != 0) {
            timestamp = Math.min(timestamp, gameFinishTime);
        }

        InitialResourceBlock[] memory initialResourceBlocks = getConfig();
        ProductionResultItem[] memory productionResult = new ProductionResultItem[](initialResourceBlocks.length);
        for (uint256 i = 0; i < initialResourceBlocks.length; i++) {
            productionResult[i] = ProductionResultItem({
                resourceName: initialResourceBlocks[i].resourceName,
                isProducing: initialResourceBlocks[i].isProducing,
                balanceChanges: 0
            });
        }

        if (timestamp <= production.lastUpdateStateTime) {
            return productionResult;
        }

        uint256 basicRegenIncome = (initialResourceBlocks[2].perTick * getBasicProductionMultiplier()) / 1e18;
        uint256 advancedRegenIncome = (initialResourceBlocks[2].perTick * getAdvancedProductionMultiplier()) / 1e18;
        uint256 degenIncome = currentSettlement.getCurrentSiegePower();

        // If basic regen greater (or equal) than degen -> actual degen is zero and basic regen reduced
        // else basic regen is zero and degen is reduced
        if (basicRegenIncome >= degenIncome) {
            basicRegenIncome = basicRegenIncome - degenIncome;
            degenIncome = 0;
        } else {
            degenIncome = degenIncome - basicRegenIncome;
            basicRegenIncome = 0;
        }

        FortData memory secondsUntilSpeedChanges = calculateFortAdvancedProduction(
            health,
            getMaxHealthOnLevel(getBuildingLevel()),
            basicRegenIncome,
            advancedRegenIncome,
            degenIncome,
            initialResourceBlocks[2].perTick * advancedProduction.toBeProducedTicks
        );

        uint256 elapsedSeconds = timestamp - production.lastUpdateStateTime;

        uint256 fullIncomeSecondsElapsed = Math.min(
            secondsUntilSpeedChanges.fullHealthProductionSeconds,
            elapsedSeconds
        );
        uint256 partialIncomeSecondsElapsed = Math.min(
            elapsedSeconds - fullIncomeSecondsElapsed,
            secondsUntilSpeedChanges.partialHealthProductionSeconds
        );

        uint256 advancedHealthProduced = fullIncomeSecondsElapsed * advancedRegenIncome + partialIncomeSecondsElapsed * degenIncome;
        uint256 healthProduced = advancedHealthProduced + elapsedSeconds * basicRegenIncome;
        uint256 healthLost = elapsedSeconds * degenIncome;
        uint256 advancedTicksProduced = advancedHealthProduced / initialResourceBlocks[2].perTick;

        for (uint256 i = 0; i < initialResourceBlocks.length; i++) {
            if (initialResourceBlocks[i].isProducing) {
                bool isHealthProduced = healthProduced >= healthLost;
                uint256 healthChanges = isHealthProduced
                    ? healthProduced - healthLost
                    : healthLost - healthProduced;

                productionResult[i].isProducing = isHealthProduced;
                productionResult[i].balanceChanges = healthChanges;
            } else {
                productionResult[i].balanceChanges = initialResourceBlocks[i].perTick * advancedTicksProduced;
            }
        }

        return productionResult;
    }
}
