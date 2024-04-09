// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../../../libraries/MathExtension.sol";
import "./IBuilding.sol";
import "../WorldAsset.sol";

abstract contract Building is WorldAsset, IBuilding {
    /// @inheritdoc IBuilding
    ISettlement public override currentSettlement;
    /// @inheritdoc IBuilding
    BasicProduction public override basicProduction;
    /// @inheritdoc IBuilding
    AdvancedProduction public override advancedProduction;
    /// @inheritdoc IBuilding
    uint256 public override upgradeCooldownFinishTime;
    /// @inheritdoc IBuilding
    uint256 public override prosperity;
    /// @inheritdoc IBuilding
    Production public override production;
    /// @inheritdoc IBuilding
    uint256 public override distributionId;
    /// @inheritdoc IBuilding
    mapping(address => uint256) public override producedResourceDebt;

    modifier onlyDistributions() {
        require(
            address(world().distributions()) == msg.sender,
            "onlyDistributions"
        );
        _;
    }

    /// @dev Allows caller to be only settlement owner
    modifier onlySettlementOwner() {
        require(
            currentSettlement.getSettlementOwner() == msg.sender,
            "onlySettlementOwner"
        );
        _;
    }

    /// @dev Allows caller to be ruler or world or world asset
    modifier onlyRulerOrWorldAssetFromSameEpoch() {
        require(
            currentSettlement.isRuler(msg.sender) ||
                msg.sender == address(world()) ||
                world().worldAssets(epochNumber(), msg.sender) != bytes32(0),
            "onlyRulerOrWorldAssetFromSameEpoch"
        );
        _;
    }

    /// @dev Creates default distribution (all possible tokens will be minted to current settlement owner)
    function setDefaultDistribution() internal {
        // Previous distributors is required for thegraph purposes
        address[] memory previousReceivers = world().distributions().getDistributionReceivers(distributionId);
        distributionId = world().distributions().mint(currentSettlement.getSettlementOwner());
        emit NewDistribution(distributionId, previousReceivers);
    }

    /// @dev Saves produced amount of resource between treasury and production.readyToBeDistributed
    function saveProducedResource(string memory resourceName, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        //N% of resources moves to treasury pool
        uint256 amountOfResourceGoingToTreasury = (amount * registry().getToTreasuryPercent()) / 1e18;

        uint256 currentTreasury = epoch().resources(resourceName).stateBalanceOf(address(this));
        uint256 maxTreasury = getMaxTreasuryByLevel(getBuildingLevel());

        if (currentTreasury >= maxTreasury) {
            amountOfResourceGoingToTreasury = 0;
        } else if (amountOfResourceGoingToTreasury > maxTreasury - currentTreasury) {
            amountOfResourceGoingToTreasury = maxTreasury - currentTreasury;
        }

        if (amountOfResourceGoingToTreasury > 0) {
            epoch().resources(resourceName).mint(address(this), amountOfResourceGoingToTreasury);
            amount = amount - amountOfResourceGoingToTreasury;
        }

        if (amount > 0) {
            currentSettlement.currentZone().increaseToxicity(
                address(currentSettlement),
                getProducingResourceName(),
                amount
            );

            production.readyToBeDistributed += amount;
        }
    }

    /// @dev Updates building prosperity according to changed amount of resources in building
    function updateProsperity() internal virtual {
        uint256 buildingLevel = getBuildingLevel();
        uint256 levelCoefficient = getBuildingCoefficient(buildingLevel);

        uint256 currentProductionResourceBalance = epoch().resources(getProducingResourceName()).stateBalanceOf(
            address(this)
        );

        uint256 prosperityBefore = prosperity;

        uint256 resourceWeight = registry().getResourceWeight(getProducingResourceName());
        uint256 potentialNewProsperity = currentProductionResourceBalance * resourceWeight / levelCoefficient;
        uint256 maxProsperity = getMaxTreasuryByLevel(buildingLevel) * resourceWeight / levelCoefficient;

        uint256 prosperityAfter = Math.min(maxProsperity, potentialNewProsperity);
        prosperity = prosperityAfter;

        if (prosperityBefore > prosperityAfter) {
            epoch().prosperity().burnFrom(address(currentSettlement), prosperityBefore - prosperityAfter);
        } else if (prosperityBefore < prosperityAfter) {
            epoch().prosperity().mint(address(currentSettlement), prosperityAfter - prosperityBefore);
        }
    }

    /// @dev Calculates current game time, taking into an account game finish time
    function getCurrentTime() internal view returns (uint256) {
        uint256 gameFinishTime = world().gameFinishTime();
        if (gameFinishTime == 0) {
            return block.timestamp;
        }

        return Math.min(block.timestamp, gameFinishTime);
    }

    /// @dev Calculates basic production multiplier
    function getBasicProductionMultiplier() internal view returns (uint256) {
        string memory currentBuildingName = buildingName();

        return (
            basicProduction.coefficient
            * registry().getBasicProductionBuildingCoefficient(currentBuildingName)
            * registry().getWorkerCapacityCoefficient(currentBuildingName)
            * registry().getGlobalMultiplier()
        ) / 1e18;
    }

    /// @dev Calculates advanced production multiplier
    function getAdvancedProductionMultiplier() internal view returns (uint256) {
        uint256 multiplierFromWorkers = getWorkers() + getAdditionalWorkersFromAdditionalWorkersCapacityMultiplier();
        return multiplierFromWorkers * registry().getGlobalMultiplier();
    }

    /// @dev Calculates amount of production ticks for current building according to its resources balances
    function calculateProductionTicksAmount() internal view returns (uint256) {
        InitialResourceBlock[] memory config = getConfig();
        uint256 productionTicksAmountUntilStop = type(uint256).max;

        for (uint256 i = 0; i < config.length; i++) {
            if (config[i].isProducing) {
                continue;
            }

            uint256 balance = epoch().resources(config[i].resourceName).stateBalanceOf(address(this));
            if (balance == 0) {
                return 0;
            }

            productionTicksAmountUntilStop = Math.min(
                balance / config[i].perTick,
                productionTicksAmountUntilStop
            );
        }

        return productionTicksAmountUntilStop;
    }

    /// @dev Calculates is building token recall allowed according to building token transfer threshold
    function isBuildingTokenRecallAllowed() internal returns (bool) {
        uint256 maxTreasury = getMaxTreasuryByLevel(getBuildingLevel());
        string memory producingResourceName = getProducingResourceName();
        if (bytes(producingResourceName).length == 0) {
            return false;
        }

        uint256 currentTreasuryThreshold = (maxTreasury * registry().getBuildingTokenTransferThresholdPercent()) / 1e18;
        uint256 currentTreasury = epoch().resources(producingResourceName).balanceOf(address(this));

        return currentTreasury <= currentTreasuryThreshold;
    }

    /// @dev Batch transfer resources from building to specified address
    function batchTransferResources(
        string[] calldata resourcesNames,
        address to,
        uint256[] calldata amounts
    ) internal {
        for (uint256 i = 0; i < resourcesNames.length; i++) {
            transferResources(resourcesNames[i], to, amounts[i]);
        }
    }

    /// @dev Transfers workers from building to specified address
    function transferWorkers(address to, uint256 amount) internal {
        epoch().workers().transfer(to, amount);
    }

    /// @dev Transfers resources from building to specified address
    function transferResources(
        string memory resourceName,
        address to,
        uint256 amount
    ) internal {
        updateState();

        IResource resource = epoch().resources(resourceName);
        uint256 balance = resource.balanceOf(address(this));
        if (balance == 0) {
            return;
        }

        if (amount > balance) {
            amount = balance;
        }

        if (keccak256(bytes(resourceName)) == keccak256(bytes(getProducingResourceName()))) {
            uint256 maxTreasury = getMaxTreasuryByLevel(getBuildingLevel());
            uint256 availableToTransfer = 0;

            if (balance > maxTreasury) {
                availableToTransfer = balance - maxTreasury;
            }

            if (amount > availableToTransfer) {
                amount = availableToTransfer;
            }
        }

        if (amount > 0) {
            resource.transfer(to, amount);
        }
    }

    /// @inheritdoc IBuilding
    function init(address settlementAddress) public virtual override initializer {
        currentSettlement = ISettlement(settlementAddress);

        basicProduction.level = 1;
        basicProduction.coefficient = 1;

        advancedProduction.level = 1;
        advancedProduction.coefficient = 1;

        uint256 timestamp = getCurrentTime();
        production.lastUpdateStateTime = timestamp;
        production.lastUpdateStateZoneTime = currentSettlement.currentZone().getZoneTime(timestamp);

        if (registry().hasStartingTreasury(buildingName())) {
            epoch().resources(getProducingResourceName()).mint(address(this), getMaxTreasuryByLevel(getBuildingLevel()));
            updateProsperity();
        }

        setDefaultDistribution();
    }

    /// @inheritdoc IBuilding
    function productionResourcesChanged() public virtual override {
        updateProsperity();
        advancedProduction.toBeProducedTicks = calculateProductionTicksAmount();
    }

    /// @inheritdoc IBuilding
    function updateState() public virtual override {
        currentSettlement.currentZone().updateState();

        uint256 currentTime = getCurrentTime();
        if (production.lastUpdateStateTime == currentTime) {
            return;
        }

        ProductionResultItem[] memory productionResult = getProductionResult(currentTime);
        production.lastUpdateStateTime = currentTime;
        production.lastUpdateStateZoneTime = currentSettlement.currentZone().getZoneTime(currentTime);

        for (uint256 i = 0; i < productionResult.length; i++) {
            if (productionResult[i].balanceChanges == 0) {
                continue;
            }

            if (productionResult[i].isProducing) {
                saveProducedResource(productionResult[i].resourceName, productionResult[i].balanceChanges);
            } else {
                epoch().resources(productionResult[i].resourceName).burn(productionResult[i].balanceChanges);
            }
        }

        updateProsperity();
    }

    /// @inheritdoc IBuilding
    function fixDebtAccordingToNewDistributionsAmounts(
        address from,
        address to,
        uint256 amount
    ) public override onlyDistributions {
        uint256 debtAmount = production.readyToBeDistributed * amount / world().distributions().getItemsPerNft();
        if (debtAmount == 0) {
            return;
        }

        producedResourceDebt[from] -= debtAmount;
        producedResourceDebt[to] += debtAmount;
    }

    /// @inheritdoc IBuilding
    function distributeToSingleShareholder(address holder) public override {
        updateState();

        IDistributions distributions = world().distributions();
        uint256 nftBalance = distributions.balanceOf(holder, distributionId);
        if (nftBalance == 0) {
            return;
        }

        uint256 partOfProduction = production.readyToBeDistributed * nftBalance / distributions.getItemsPerNft() - producedResourceDebt[holder];
        if (partOfProduction == 0) {
            return;
        }

        producedResourceDebt[holder] += partOfProduction;
        string memory productionResourceType = getProducingResourceName();
        epoch().resources(productionResourceType).mint(holder, partOfProduction);
        emit DistributedToShareHolder(productionResourceType, holder, partOfProduction);
    }

    /// @inheritdoc IBuilding
    function distributeToAllShareholders() public override {
        updateState();

        uint256 readyToBeDistributed = production.readyToBeDistributed;
        string memory productionResourceType = getProducingResourceName();
        IResource producingResource = epoch().resources(productionResourceType);
        IDistributions distributions = world().distributions();
        uint256 itemsPerNft = distributions.getItemsPerNft();

        address[] memory topHolders = world().distributions().getDistributionReceivers(distributionId);
        for (uint256 i = 0; i < topHolders.length; i++) {
            address holder = topHolders[i];
            uint256 holderDebt = producedResourceDebt[holder];
            uint256 partOfProduction = ((readyToBeDistributed * distributions.balanceOf(holder, distributionId)) / itemsPerNft) - holderDebt;
            if (holderDebt > 0) {
                producedResourceDebt[holder] = 0;
            }

            if (partOfProduction > 0) {
                producingResource.mint(holder, partOfProduction);
                emit DistributedToShareHolder(productionResourceType, holder, partOfProduction);
            }
        }

        production.readyToBeDistributed = 0;
    }

    /// @inheritdoc IBuilding
    function getResourcesAmount(string memory _resourceName, uint256 _timestamp)
        public
        view
        virtual
        override
        returns (uint256)
    {
        ProductionResultItem[] memory result = getProductionResult(_timestamp);

        bytes32 resourceNameBytes = keccak256(bytes(_resourceName));

        for (uint256 i = 0; i < result.length; i++) {
            if (keccak256(bytes(result[i].resourceName)) == resourceNameBytes) {
                if (result[i].isProducing) {
                    uint256 maxTreasury = getMaxTreasuryByLevel(getBuildingLevel());
                    if (maxTreasury == 0) {
                        return 0;
                    }

                    uint256 amountOfResourcePotentiallyGoingToTreasury = (result[i].balanceChanges * registry().getToTreasuryPercent()) / 1e18;
                    uint256 currentTreasuryResourcesAmount = epoch().resources(getProducingResourceName()).stateBalanceOf(address(this));

                    // In case if building has more resources than max in treasury -> none of production resources will go to the treasury
                    // therefore building doesnt produced anything to the building
                    if (currentTreasuryResourcesAmount >= maxTreasury) {
                        return currentTreasuryResourcesAmount;
                    }

                    return Math.min(
                        amountOfResourcePotentiallyGoingToTreasury + currentTreasuryResourcesAmount,
                        maxTreasury
                    );
                } else {
                    return epoch().resources(_resourceName).stateBalanceOf(address(this)) - result[i].balanceChanges;
                }
            }
        }

        return 0;
    }

    /// @inheritdoc IBuilding
    function getProductionResult(uint256 timestamp)
        public
        view
        virtual
        override
        returns (ProductionResultItem[] memory)
    {
        if (timestamp == 0) {
            timestamp = block.timestamp;
        }

        uint256 gameFinishTime = world().gameFinishTime();
        if (gameFinishTime != 0) {
            timestamp = Math.min(timestamp, gameFinishTime);
        }

        InitialResourceBlock[] memory config = getConfig();
        ProductionResultItem[] memory productionResult = new ProductionResultItem[](config.length);
        for (uint256 i = 0; i < config.length; i++) {
            productionResult[i] = ProductionResultItem({
                resourceName: config[i].resourceName,
                isProducing: config[i].isProducing,
                balanceChanges: 0
            });
        }

        if (timestamp <= production.lastUpdateStateTime) {
            return productionResult;
        }

        uint256 zoneTime = currentSettlement.currentZone().getZoneTime(timestamp);

        uint256 producedTicksByBasicProduction = getProducedTicksByBasicProduction(
            production.lastUpdateStateZoneTime,
            zoneTime
        );

        uint256 producedTicksByAdvancedProduction = getProducedTicksByAdvancedProduction(
            production.lastUpdateStateZoneTime,
            zoneTime,
            advancedProduction.toBeProducedTicks
        );

        for (uint256 i = 0; i < config.length; i++) {
            productionResult[i].balanceChanges = config[i].perTick * producedTicksByAdvancedProduction;

            // Is producing value increased here because basic production does not stop and building upgrades through time
            if (productionResult[i].isProducing) {
                productionResult[i].balanceChanges += config[i].perTick * producedTicksByBasicProduction;
            }
        }

        return productionResult;
    }

    /// @dev Calculates how many ticks produced by advanced production for provided start, finish time and is production surpassed finish time
    function getProducedTicksByAdvancedProduction(
        uint256 advancedProductionStartTime,
        uint256 advancedProductionFinishTime,
        uint256 toBeProducedTicks
    ) internal view returns (uint256) {
        if (advancedProductionFinishTime <= advancedProductionStartTime) {
            return 0;
        }

        uint256 advancedProductionDuration = advancedProductionFinishTime - advancedProductionStartTime;

        uint256 productionMultiplier = getAdvancedProductionMultiplier();
        uint256 ticksPassed = advancedProductionDuration / (1e18 / registry().getProductionTicksInSecond());

        return Math.min(
            ticksPassed * productionMultiplier / 1e18,
            toBeProducedTicks
        );
    }

    /// @inheritdoc IBuilding
    function getBuildingCoefficient(uint256 level) public override pure returns (uint256) {
        uint256 increaseByEveryNLevels = 5;
        uint256 b = level / increaseByEveryNLevels;
        uint256 c = level - b * increaseByEveryNLevels;
        uint256 d = (((b + 1) * b) / 2) * increaseByEveryNLevels;
        uint256 e = d + c * (b + 1);
        return e;
    }

    /// @dev Calculates how many ticks produced by basic production for provided start, finish time and basic production coefficient
    function getProducedTicksByBasicProduction(
        uint256 basicProductionStartTime,
        uint256 basicProductionFinishTime
    ) internal view returns (uint256) {
        uint256 basicProductionDuration = basicProductionFinishTime - basicProductionStartTime;
        uint256 ticksPassed = basicProductionDuration / (1e18 / registry().getProductionTicksInSecond());

        return getBasicProductionMultiplier() * ticksPassed / 1e18;
    }

    /// @inheritdoc IBuilding
    function resetDistribution() public override virtual onlySettlementOwner {
        require(isBuildingTokenRecallAllowed(), "Token recall not allowed");
        distributeToAllShareholders();
        setDefaultDistribution();
    }

    /// @inheritdoc IBuilding
    function isResourceAcceptable(string memory _resourceName) public view override returns (bool) {
        InitialResourceBlock[] memory config = getConfig();
        for (uint256 i = 0; i < config.length; i++) {
            if (keccak256(bytes(config[i].resourceName)) == keccak256(bytes(_resourceName))) {
                return true;
            }
        }

        return false;
    }

    /// @inheritdoc IBuilding
    function removeResourcesAndWorkers(
        address workersReceiverAddress,
        uint256 workersAmount,
        address resourcesReceiverAddress,
        string[] calldata resourceTypes,
        uint256[] calldata resourcesAmounts
    ) public override onlyActiveGame onlyRulerOrWorldAssetFromSameEpoch {
        if (workersAmount > 0) {
            transferWorkers(workersReceiverAddress, workersAmount);
        }

        batchTransferResources(resourceTypes, resourcesReceiverAddress, resourcesAmounts);
    }

    /// @inheritdoc IBuilding
    function getUpgradePrice(uint256 level)
        public
        view
        virtual
        override
        returns (uint256)
    {
        uint256 maxTreasuryByLevel = getMaxTreasuryByLevel(level);
        uint256 maxTreasuryByNextLevel = getMaxTreasuryByLevel(level + 1);
        uint256 maxTreasuryByLevelWithCoefficient = (maxTreasuryByLevel * 75) / 100;
        uint256 treasuryDifference = maxTreasuryByNextLevel - maxTreasuryByLevelWithCoefficient;
        return treasuryDifference / 6;
    }

    /// @inheritdoc IBuilding
    function getBuildingLevel() public view override returns (uint256) {
        return basicProduction.level + advancedProduction.level;
    }

    /// @inheritdoc IBuilding
    function getWorkers() public view virtual override returns (uint256) {
        return epoch().workers().balanceOf(address(this));
    }

    /// @inheritdoc IBuilding
    function startBasicUpgrade(address resourcesOwner) public virtual override onlyActiveGame onlyRulerOrWorldAssetFromSameEpoch {
        updateState();

        require(getCurrentTime() >= upgradeCooldownFinishTime, "already upgrading");

        uint256 buildingLevel = getBuildingLevel();
        uint256 upgradePrice = getUpgradePrice(buildingLevel);
        string memory upgradeResourceType = "WOOD";

        if (resourcesOwner == address(0)) {
            epoch().resources(upgradeResourceType).burnFrom(msg.sender, upgradePrice);
        } else {
            IResource upgradeResource = epoch().resources(upgradeResourceType);
            upgradeResource.spendAllowance(resourcesOwner, msg.sender, upgradePrice);
            upgradeResource.burnFrom(resourcesOwner, upgradePrice);
        }

        currentSettlement.currentZone().decreaseToxicity(address(currentSettlement), upgradeResourceType, upgradePrice);

        upgradeCooldownFinishTime = block.timestamp + getBasicUpgradeCooldownDuration(buildingLevel);

        uint256 newBuildingLevel = buildingLevel + 1;
        basicProduction.level += 1;

        uint256 coefficientDelta = getBuildingCoefficient(newBuildingLevel) - getBuildingCoefficient(buildingLevel);
        basicProduction.coefficient += coefficientDelta;

        updateProsperity();

        emit UpgradeFinish(newBuildingLevel);
    }

    /// @inheritdoc IBuilding
    function startAdvancedUpgrade(address resourcesOwner) public virtual override onlyActiveGame onlyRulerOrWorldAssetFromSameEpoch {
        updateState();

        require(getCurrentTime() >= upgradeCooldownFinishTime, "already upgrading");

        uint256 buildingLevel = getBuildingLevel();
        uint256 upgradePrice = getUpgradePrice(buildingLevel);
        string memory upgradeResourceType = "ORE";

        if (resourcesOwner == address(0)) {
            epoch().resources(upgradeResourceType).burnFrom(msg.sender, upgradePrice);
        } else {
            IResource upgradeResource = epoch().resources(upgradeResourceType);
            upgradeResource.spendAllowance(resourcesOwner, msg.sender, upgradePrice);
            upgradeResource.burnFrom(resourcesOwner, upgradePrice);
        }

        currentSettlement.currentZone().decreaseToxicity(address(currentSettlement), upgradeResourceType, upgradePrice);

        upgradeCooldownFinishTime = block.timestamp + getAdvancedUpgradeCooldownDuration(buildingLevel);

        uint256 newBuildingLevel = buildingLevel + 1;
        advancedProduction.level += 1;

        uint256 coefficientDelta = getBuildingCoefficient(newBuildingLevel) - getBuildingCoefficient(buildingLevel);
        advancedProduction.coefficient += coefficientDelta;

        updateProsperity();

        emit UpgradeFinish(newBuildingLevel);
    }

    /// @inheritdoc IBuilding
    function getBasicUpgradeCooldownDuration(uint256 level) public view virtual override returns (uint256) {
        return level * 6 hours / registry().getGlobalMultiplier();
    }

    /// @inheritdoc IBuilding
    function getAdvancedUpgradeCooldownDuration(uint256 level) public view virtual override returns (uint256) {
        return 0;
    }

    /// @inheritdoc IBuilding
    function getProducingResourceName() public view virtual override returns (string memory) {
        InitialResourceBlock[] memory initialResourceBlocks = getConfig();
        for (uint256 i = 0; i < initialResourceBlocks.length; i++) {
            if (initialResourceBlocks[i].isProducing) {
                return initialResourceBlocks[i].resourceName;
            }
        }

        return "";
    }

    /// @inheritdoc IBuilding
    function getMaxWorkers() public view override returns (uint256) {
        return advancedProduction.coefficient * registry().getWorkerCapacityCoefficient(buildingName());
    }

    /// @inheritdoc IBuilding
    function getTreasury(uint256 timestamp) public view virtual override returns (uint256) {
        return getResourcesAmount(getProducingResourceName(), timestamp);
    }

    /// @inheritdoc IBuilding
    function getMaxTreasuryByLevel(uint256 level) public view virtual override returns (uint256) {
        return (getBuildingCoefficient(level) ** 2) * 10 * 1e18;
    }

    /// @inheritdoc IBuilding
    function stealTreasury(address to, uint256 amountToSteal)
        public
        override
        onlyActiveGame
        onlyWorldAssetFromSameEpoch
        returns (uint256)
    {
        updateState();

        uint256 currentTreasuryResourcesAmount = epoch().resources(getProducingResourceName()).stateBalanceOf(address(this));
        uint256 currentTreasuryAmount = Math.min(getMaxTreasuryByLevel(getBuildingLevel()), currentTreasuryResourcesAmount);
        if (currentTreasuryAmount == 0) {
            return 0;
        }

        amountToSteal = Math.min(currentTreasuryAmount, amountToSteal);

        uint256 amountToBurn = (amountToSteal * registry().getRobberyFee()) / 1e18;

        IResource resource = epoch().resources(getProducingResourceName());
        resource.transfer(to, amountToSteal - amountToBurn);
        burnTreasury(amountToBurn);

        return amountToSteal;
    }

    /// @inheritdoc IBuilding
    function burnTreasury(uint256 burnAmount) public override onlyActiveGame onlyWorldAssetFromSameEpoch {
        IResource resource = epoch().resources(getProducingResourceName());
        resource.burn(burnAmount);
        updateProsperity();
    }

    /// @inheritdoc IBuilding
    function increaseAdditionalWorkersCapacityMultiplier(uint256 capacityAmount) public override onlyWorldAssetFromSameEpoch {
        updateState();

        advancedProduction.additionalWorkersCapacityMultiplier += capacityAmount;

        // Kick out extra workers from building into settlement
        uint256 maxAvailableForAdvancedProductionWorkers = getMaxAvailableForAdvancedProductionWorkers();
        uint256 currentWorkers = getWorkers();
        if (currentWorkers > maxAvailableForAdvancedProductionWorkers) {
            uint256 workersToKickOut = currentWorkers - maxAvailableForAdvancedProductionWorkers;
            transferWorkers(address(currentSettlement), workersToKickOut);
        }
        //
    }

    /// @inheritdoc IBuilding
    function decreaseAdditionalWorkersCapacityMultiplier(uint256 capacityAmount) public override onlyWorldAssetFromSameEpoch {
        updateState();

        advancedProduction.additionalWorkersCapacityMultiplier -= capacityAmount;
    }

    /// @inheritdoc IBuilding
    function getAdditionalWorkersFromAdditionalWorkersCapacityMultiplier() public view override returns (uint256) {
        uint256 currentWorkersCapacityMultiplier = Math.min(
            advancedProduction.additionalWorkersCapacityMultiplier,
            registry().getMaxAdvancedProductionTileBuff()
        );

        uint256 maxWorkers = getMaxWorkers();
        return MathExtension.roundDownWithPrecision(
            maxWorkers * currentWorkersCapacityMultiplier / 1e18,
            1e18
        );
    }

    /// @inheritdoc IBuilding
    function getMaxAvailableForAdvancedProductionWorkers() public view override returns (uint256) {
        return getMaxWorkers() - getAdditionalWorkersFromAdditionalWorkersCapacityMultiplier();
    }

    /// @inheritdoc IBuilding
    function getConfig() public view virtual override returns (InitialResourceBlock[] memory initialResourceBlocks);

    /// @inheritdoc IBuilding
    function buildingName() public view virtual override returns (string memory) {
        return assetType();
    }
}

