// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./IRegistry.sol";
import "./IWorld.sol";
import "./assets/building/IBuilding.sol";
import "./assets/epoch/IEpochFactory.sol";
import "./crossEpochsMemory/ICrossEpochsMemory.sol";

contract World is IWorld, Initializable {
    /// @inheritdoc IWorld
    IRegistry public override registry;
    /// @inheritdoc IWorld
    IGeography public override geography;
    /// @inheritdoc IWorld
    IERC721 public override bannerContract;
    /// @inheritdoc IWorld
    IERC20 public override blessToken;
    /// @inheritdoc IWorld
    IDistributions public override distributions;
    /// @inheritdoc IWorld
    ICrossEpochsMemory public override crossEpochsMemory;
    /// @inheritdoc IWorld
    IRewardPool public override rewardPool;

    /// @inheritdoc IWorld
    uint256 public override gameStartTime;
    /// @inheritdoc IWorld
    uint256 public override gameFinishTime;

    /// @inheritdoc IWorld
    uint256 public override currentEpochNumber;
    /// @inheritdoc IWorld
    mapping(uint256 => IEpoch) public override epochs;
    /// @inheritdoc IWorld
    mapping(uint256 => mapping(address => bytes32)) public override worldAssets;

    /// @dev Allows function to be callable only while game is active
    modifier onlyActiveGame() {
        uint256 finishTime = gameFinishTime;
        require(finishTime == 0 || block.timestamp < finishTime, "onlyActiveGame");
        _;
    }

    /// @dev Allows caller to be only mighty creator or reward pool
    modifier onlyMightyCreatorOrRewardPool() {
        require(msg.sender == registry.mightyCreator() || msg.sender == address(rewardPool), "onlyMightyCreatorOrRewardPool");
        _;
    }

    /// @dev Allows caller to be only mighty creator
    modifier onlyMightyCreator() {
        require(msg.sender == registry.mightyCreator(), "onlyMightyCreator");
        _;
    }

    /// @dev Allows caller to be only factory contract
    modifier onlyFactory() {
        require(registry.isFactoryContract(msg.sender), "onlyFactory");
        _;
    }

    /// @inheritdoc IWorld
    function init(
        address registryContractAddress,
        address crossEpochsMemoryAddress,
        address geographyAddress,
        address bannersAddress,
        address blessTokenAddress,
        address distributionsAddress,
        address rewardPoolAddress
    ) public override initializer {
        registry = IRegistry(registryContractAddress);
        crossEpochsMemory = ICrossEpochsMemory(crossEpochsMemoryAddress);
        geography = IGeography(geographyAddress);
        bannerContract = IERC721(bannersAddress);
        blessToken = IERC20(blessTokenAddress);
        distributions = IDistributions(distributionsAddress);
        rewardPool = IRewardPool(rewardPoolAddress);

        emit WorldInitialized(
            registryContractAddress,
            geographyAddress,
            bannersAddress,
            blessTokenAddress,
            distributionsAddress,
            rewardPoolAddress
        );

        createAndAssignEpoch(currentEpochNumber);
    }

    /// @inheritdoc IWorld
    function addWorldAsset(
        uint256 epochNumber,
        address worldAsset,
        bytes32 assetType
    ) public override onlyFactory {
        worldAssets[epochNumber][worldAsset] = assetType;
    }

    /// @inheritdoc IWorld
    function setGameStartTime(uint256 value) public override onlyMightyCreator {
        gameStartTime = value;
        emit GameStartTimeUpdated(value);
    }

    /// @inheritdoc IWorld
    function setGameFinishTime(uint256 value) public override onlyMightyCreatorOrRewardPool {
        gameFinishTime = value;
        emit GameFinishTimeUpdated(value);
    }

    /// @dev Creates epoch
    function createEpoch(uint256 epochNumber) internal returns (IEpoch) {
        IEpochFactory epochFactory = IEpochFactory(
            registry.factoryContracts(keccak256(bytes(("epoch"))))
        );

        return IEpoch(epochFactory.create(address(this), epochNumber, "BASIC"));
    }

    /// @dev Create and assign epoch
    function createAndAssignEpoch(uint256 epochNumber) internal {
        epochs[epochNumber] = createEpoch(epochNumber);
        emit NewWorldEpoch(address(epochs[epochNumber]), epochNumber);

        setCurrentEpochNumber(epochNumber);
    }

    /// @dev Sets current epoch number
    function setCurrentEpochNumber(uint256 newEpochNumber) internal {
        currentEpochNumber = newEpochNumber;
        emit CurrentEpochNumberUpdated(newEpochNumber);
    }

    /// @inheritdoc IWorld
    function mintWorkers(
        uint256 epochNumber,
        address _to,
        uint256 _value
    ) public override onlyMightyCreator {
        epochs[epochNumber].workers().mint(_to, _value);
    }

    /// @inheritdoc IWorld
    function mintUnits(
        uint256 epochNumber,
        string memory _unitName,
        address _to,
        uint256 _value
    ) public override onlyMightyCreator {
        epochs[epochNumber].units(_unitName).mint(_to, _value);
    }

    /// @inheritdoc IWorld
    function mintResources(
        uint256 epochNumber,
        string memory _resourceName,
        address _to,
        uint256 _value
    ) public override onlyMightyCreator {
        epochs[epochNumber].resources(_resourceName).mint(_to, _value);
    }

    /// @inheritdoc IWorld
    function batchTransferResources(
        uint256 epochNumber,
        address to,
        string[] calldata resourcesNames,
        uint256[] calldata amounts
    ) public override {
        for (uint256 i = 0; i < resourcesNames.length; i++) {
            epochs[epochNumber].resources(resourcesNames[i]).transferFrom(msg.sender, to, amounts[i]);
        }
    }

    /// @inheritdoc IWorld
    function destroyCurrentEpoch() public override onlyActiveGame {
        IEpoch epoch = epochs[currentEpochNumber];

        uint256 noDestructionDelay = registry.getCultistsNoDestructionDelay() / registry.getGlobalMultiplier();
        uint256 destructionAvailabilityTime = epoch.mostRecentCultistsSummonTime() + noDestructionDelay;
        require(block.timestamp > destructionAvailabilityTime, "destruction not available yet");

        uint256 maxAllowedCultists = geography.getZonesCount() * registry.getCultistsPerZoneMultiplier();
        require(epoch.totalCultists() > maxAllowedCultists, "cultists limit not reached");

        uint256 newEpochNumber = currentEpochNumber + 1;
        createAndAssignEpoch(newEpochNumber);
        rewardPool.handleEpochDestroyed();
    }

    function destroyCurrentEpochWithoutCondition() public onlyMightyCreator {
        createAndAssignEpoch(currentEpochNumber + 1);
        rewardPool.handleEpochDestroyed();
    }
}
