// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../IWorld.sol";
import "../settlement/ISettlement.sol";

/// @title Building interface
/// @notice Functions to read state/modify state in order to get current building parameters and/or interact with it
interface IBuilding {
    struct BasicProduction {
        uint256 level;
        uint256 coefficient;
    }

    struct AdvancedProduction {
        uint256 level;
        uint256 coefficient;
        uint256 additionalWorkersCapacityMultiplier;
        uint256 toBeProducedTicks;
    }

    struct Production {
        uint256 lastUpdateStateTime;
        uint256 lastUpdateStateZoneTime;
        uint256 readyToBeDistributed;
    }

    struct ProductionResultItem {
        string resourceName;
        uint256 balanceChanges;
        bool isProducing;
    }

    struct InitialResourceBlock {
        string resourceName;
        uint256 perTick;
        bool isProducing;
    }

    /// @notice Emitted when #startBasicUpgrade or #startAdvancedUpgrade is called
    /// @param stateLevel New building level
    event UpgradeFinish(uint256 stateLevel);

    /// @notice Emitted when #distribute is called. When resources from production are distributed to building token holders. Will be deprecated in favor of ERC20 transfer event.
    /// @param resourceName Name of resource distributed
    /// @param holder Receiver address
    /// @param amount Amount of distributed resources
    event DistributedToShareHolder(string resourceName, address holder, uint256 amount);

    /// @notice Emitted when #setDefaultDistribution is called
    /// @param distributionId Newly created distribution id
    /// @param previousReceivers Previous distribution receivers
    event NewDistribution(uint256 distributionId, address[] previousReceivers);

    // State variables

    /// @notice Settlement address to which this building belongs
    /// @dev Immutable, initialized on the building creation
    function currentSettlement() external view returns (ISettlement);

    /// @notice Basic production
    /// @dev Contains basic production upgrade data
    /// @return level Basic production level
    /// @return coefficient Basic production coefficient
    function basicProduction() external view returns (
        uint256 level,
        uint256 coefficient
    );

    /// @notice Advanced production
    /// @dev Contains advanced production upgrade data
    /// @return level Advanced production level
    /// @return coefficient Advanced production coefficient
    /// @return additionalWorkersCapacityMultiplier Additional workers capacity multiplier
    /// @return toBeProducedTicks To be produced ticks of producing resource
    function advancedProduction() external view returns (
        uint256 level,
        uint256 coefficient,
        uint256 additionalWorkersCapacityMultiplier,
        uint256 toBeProducedTicks
    );

    /// @notice Upgrade cooldown finish time
    /// @dev Updated when #startBasicUpgrade or #startAdvancedUpgrade is called
    /// @return upgradeCooldownFinishTime Upgrade cooldown finish time
    function upgradeCooldownFinishTime() external view returns (uint256 upgradeCooldownFinishTime);

    /// @notice Buildings prosperity
    /// @dev Contains last written prosperity amount in building
    /// @return prosperity Current building prosperity
    function prosperity() external view returns (uint256 prosperity);

    /// @notice Contains current production state of the building
    /// @dev Contains information related to how production is calculated
    /// @return lastUpdateStateTime Time at which last #updateState is called
    /// @return lastUpdateStateZoneTime Zone time at which last #updateState is called
    /// @return readyToBeDistributed Amount of produced resource ready to be distributed
    function production()
        external
        view
        returns (
            uint256 lastUpdateStateTime,
            uint256 lastUpdateStateZoneTime,
            uint256 readyToBeDistributed
        );

    /// @notice Distribution id
    /// @dev Initialized on creation and updated on #resetDistribution
    function distributionId() external view returns (uint256);

    /// @notice Produced resource debt
    /// @dev Updated when #distributeToSingleHolder or #distributeToAllShareholders is called
    function producedResourceDebt(address holder) external view returns (uint256);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param settlementAddress Settlement address
    function init(address settlementAddress) external;

    /// @notice Resets current building distribution
    /// @dev Creates new distribution Nft and mints it to current settlement owner
    function resetDistribution() external;

    /// @notice Callback which recalculates production. Called when resources related to production of this building is transferred from/to this building
    /// @dev Even though function is opened, it is auto-called by transfer method. Standalone calls provide 0 impact.
    function productionResourcesChanged() external;

    /// @notice Updates state of this building up to block.timestamp
    /// @dev Updates building production minting treasury and increasing #production.readyToBeDistributed
    function updateState() external;

    /// @notice Fixes debt from shareholder whenever its share part changes
    /// @dev Even though function is opened, it can be called only by distributions
    /// @param from From address
    /// @param to To address
    /// @param amount Amount
    function fixDebtAccordingToNewDistributionsAmounts(
        address from,
        address to,
        uint256 amount
    ) external;

    /// @notice Distributes produced resource to single shareholder
    /// @dev Useful to taking part of the resource from the building for single shareholder (to not pay gas for minting for all shareholders)
    /// @param holder Holder
    function distributeToSingleShareholder(address holder) external;

    /// @notice Distributes produces resource to all shareholders
    /// @dev Useful to get full produced resources to all shareholders
    function distributeToAllShareholders() external;

    /// @notice Calculates building coefficient by provided level
    /// @dev Used to determine max treasury amount and new production coefficients
    /// @param level Building level
    /// @return buildingCoefficient Building coefficient
    function getBuildingCoefficient(uint256 level) external pure returns (uint256 buildingCoefficient);

    /// @notice Calculates amount of workers currently sitting in this building
    /// @dev Same as workers.balanceOf(buildingAddress)
    /// @return workersAmount Amount of workers currently sitting in this building
    function getWorkers() external view returns (uint256 workersAmount);

    /// @notice Calculates real amount of provided resource in building related to its production at provided time
    /// @dev Useful for determination how much of production resource (either producing and spending) at the specific time
    /// @param resourceName Name of resource related to production
    /// @param timestamp Time at which calculate amount of resources in building. If timestamp=0 -> calculates as block.timestamp
    /// @return resourcesAmount Real amount of provided resource in building related to its production at provided time
    function getResourcesAmount(string memory resourceName, uint256 timestamp) external view returns (uint256 resourcesAmount);

    /// @notice Calculates production resources changes at provided time
    /// @dev Useful for determination how much of all production will be burned/produced at the specific time
    /// @param timestamp Time at which calculate amount of resources in building. If timestamp=0 -> calculates as block.timestamp
    /// @return productionResult Production resources changes at provided time
    function getProductionResult(uint256 timestamp) external view returns (ProductionResultItem[] memory productionResult);

    /// @notice Calculates upgrade price by provided level
    /// @dev Useful for determination how much upgrade will cost at any level
    /// @param level Level at which calculate price
    /// @return price Amount of resources needed for upgrade
    function getUpgradePrice(uint256 level) external view returns (uint256 price);

    /// @notice Calculates basic upgrade duration for provided level
    /// @dev If level=1 then returned value will be duration which is taken for upgrading from 1 to 2 level
    /// @param level At which level calculate upgrade duration
    /// @return upgradeCooldownDuration Upgrade cooldown duration
    function getBasicUpgradeCooldownDuration(uint256 level) external view returns (uint256 upgradeCooldownDuration);

    /// @notice Calculates advanced upgrade duration for provided level
    /// @dev If level=1 then returned value will be duration which is taken for upgrading from 1 to 2 level
    /// @param level At which level calculate upgrade duration
    /// @return upgradeCooldownDuration Upgrade cooldown duration
    function getAdvancedUpgradeCooldownDuration(uint256 level) external view returns (uint256 upgradeCooldownDuration);

    /// @notice Starts basic building upgrade
    /// @dev Resources required for upgrade will be taken either from msg.sender or resourcesOwner (if resource.allowance allows it)
    /// @dev If resourcesOwner == address(0) -> resources will be taken from msg.sender
    /// @dev If resourcesOwner != address(0) and resourcesOwner has given allowance to msg.sender >= upgradePrice -> resources will be taken from resourcesOwner
    /// @param resourcesOwner Resources owner
    function startBasicUpgrade(address resourcesOwner) external;

    /// @notice Starts advanced building upgrade
    /// @dev Resources required for upgrade will be taken either from msg.sender or resourcesOwner (if resource.allowance allows it)
    /// @dev If resourcesOwner == address(0) -> resources will be taken from msg.sender
    /// @dev If resourcesOwner != address(0) and resourcesOwner has given allowance to msg.sender >= upgradePrice -> resources will be taken from resourcesOwner
    /// @param resourcesOwner Resources owner
    function startAdvancedUpgrade(address resourcesOwner) external;

    /// @notice Calculates current level
    /// @dev Takes into an account if upgrades are finished or not
    /// @return level Current building level
    function getBuildingLevel() external view returns (uint256 level);

    /// @notice Returns production config for current building
    /// @dev Main config that determines which resources is produced/spend by production of this building
    /// @dev InitialResourceBlock.perTick is value how much of resource is spend/produced by 1 worker in 1 second of production
    /// @return initialResourceBlocks Production config for current building
    function getConfig() external view returns (InitialResourceBlock[] memory initialResourceBlocks);

    /// @notice Transfers game resources and workers from building to provided addresses
    /// @dev Removes resources+workers from building in single transaction
    /// @param workersReceiverAddress Workers receiver address (building or settlement)
    /// @param workersAmount Workers amount (in 1e18 precision)
    /// @param resourcesReceiverAddress Resources receiver address
    /// @param resourceTypes Resource types
    /// @param resourcesAmounts Resources amounts
    function removeResourcesAndWorkers(
        address workersReceiverAddress,
        uint256 workersAmount,
        address resourcesReceiverAddress,
        string[] calldata resourceTypes,
        uint256[] calldata resourcesAmounts
    ) external;

    /// @notice Calculates maximum amount of treasury by provided level
    /// @dev Can be used to determine maximum amount of treasury by any level
    /// @param level Building level
    /// @param maxTreasury Maximum amount of treasury
    function getMaxTreasuryByLevel(uint256 level) external view returns (uint256 maxTreasury);

    /// @notice Steals resources from treasury
    /// @dev Called by siege or building owner, in either case part of resources will be burned according to #registry.getRobberyFee
    /// @param to An address which will get resources
    /// @param amount Amount of resources to steal, 'to' will get only part of specified 'amount', some percent of specified 'amount' will be burned
    /// @return realAmount Real amount of resources from which stealing occurred (min(amount, treasury))
    function stealTreasury(
        address to,
        uint256 amount
    ) external returns (uint256 realAmount);

    /// @notice Burns building treasury
    /// @dev Can be called by world asset or building owner
    /// @param amount Amount of resources to burn from treasury
    function burnTreasury(
        uint256 amount
    ) external;

    /// @notice Increases additional workers capacity multiplier
    /// @dev Even though function is opened, it can be called only by world asset
    /// @param capacityAmount Capacity amount
    function increaseAdditionalWorkersCapacityMultiplier(uint256 capacityAmount) external;

    /// @notice Decreases additional workers capacity multiplier
    /// @dev Even though function is opened, it can be called only by world asset
    /// @param capacityAmount Capacity amount
    function decreaseAdditionalWorkersCapacityMultiplier(uint256 capacityAmount) external;

    /// @notice Calculates maximum amount of workers
    /// @dev Useful to determinate maximum amount of workers
    /// @return workersAmount Maximum amount of workers
    function getMaxWorkers() external view returns (uint256 workersAmount);

    /// @notice Calculates producing resource name for this building
    /// @dev Return value is value from #getConfig where 'isProduced'=true
    /// @return resourceName Name of producing resource
    function getProducingResourceName() external view returns (string memory resourceName);

    /// @notice Calculates treasury amount at specified time
    /// @dev Useful for determination how much treasury will be at specific time
    /// @param timestamp Time at which calculate amount of treasury in building. If timestamp=0 -> calculates as block.timestamp
    /// @return treasury Treasury amount at specified time
    function getTreasury(uint256 timestamp) external view returns (uint256 treasury);

    /// @notice Calculates if building is capable to accept resource
    /// @dev Return value based on #getConfig
    /// @param resourceName Name of resource
    /// @return isResourceAcceptable Is building can accept resource
    function isResourceAcceptable(string memory resourceName) external view returns (bool isResourceAcceptable);

    /// @notice Calculates max available for advanced production workers
    /// @dev Difference between getMaxWorkers() and getAdditionalWorkersFromAdditionalWorkersCapacityMultiplier()
    function getMaxAvailableForAdvancedProductionWorkers() external view returns (uint256);

    /// @notice Calculates additional workers 'granted' from capacity multiplier
    /// @dev Return value based on current advancedProduction.additionalWorkersCapacityMultiplier
    function getAdditionalWorkersFromAdditionalWorkersCapacityMultiplier() external view returns (uint256);

    /// @notice Returns building name
    /// @dev Same value as #assetName
    /// @return buildingName Building name
    function buildingName() external view returns (string memory buildingName);
}
