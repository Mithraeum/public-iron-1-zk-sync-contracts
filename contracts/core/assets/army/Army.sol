// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "../battle/IBattleFactory.sol";
import "./IArmy.sol";
import "../../IWorld.sol";
import "../settlement/ISettlement.sol";
import "../battle/IBattle.sol";
import "../epoch/IEpoch.sol";
import "../zone/IZone.sol";
import "../siege/ISiege.sol";
import "../../IRegistry.sol";
import "../../../libraries/MathExtension.sol";
import "../WorldAsset.sol";
import "../building/impl/IFort.sol";

contract Army is WorldAsset, IArmy {
    /// @inheritdoc IArmy
    ISettlement public override currentSettlement;
    /// @inheritdoc IArmy
    uint32 public override currentPosition;
    /// @inheritdoc IArmy
    uint32 public override destinationPosition;
    /// @inheritdoc IArmy
    IBattle public override battle;
    /// @inheritdoc IArmy
    ISiege public override siege;
    /// @inheritdoc IArmy
    MovementTiming public override movementTiming;
    /// @inheritdoc IArmy
    StunTiming public override stunTiming;
    /// @inheritdoc IArmy
    uint32[] public override movementPath;
    /// @inheritdoc IArmy
    uint256 public override lastDemilitarizationTime;

    /// @dev Allows caller to be only ruler or any world asset
    modifier onlyOwnerOrWorldAssetFromSameEpoch() {
        require(
            currentSettlement.isRuler(msg.sender) ||
                msg.sender == address(world()) ||
                world().worldAssets(WorldAssetStorageAccessor.epochNumber(), msg.sender) != bytes32(0),
            "onlyOwnerOrWorldAssetFromSameEpoch"
        );
        _;
    }

    /// @inheritdoc IArmy
    function init(address settlementAddress) public override initializer {
        currentSettlement = ISettlement(settlementAddress);
        currentPosition = currentSettlement.position();
    }

    /// @inheritdoc IArmy
    function getMovementPath() public view override returns (uint32[] memory) {
        return movementPath;
    }

    /// @dev Applies stun
    function applyStun(
        uint64 stunStartTime,
        uint64 stunDuration
    ) internal {
        uint64 newStunEndTime = stunStartTime + stunDuration;
        if (newStunEndTime > stunTiming.endTime) {
            stunTiming.endTime = newStunEndTime;
            stunTiming.startTime = stunStartTime;
        }
    }

    /// @inheritdoc IArmy
    function updateState() public override onlyActiveGame {
        if (address(battle) != address(0)) {
            if (!battle.isFinishedBattle() && battle.canFinishBattle()) {
                battle.finishBattle();
            }

            if (battle.isFinishedBattle()) {
                address oldBattleAddress = address(battle);
                require(oldBattleAddress != address(0), "not in battle");
                battle.removeArmyFromBattle(address(this));

                IBattle oldBattle = IBattle(oldBattleAddress);

                bool isArmyWon = oldBattle.armySide(address(this)) == oldBattle.winningSide();
                if (!isArmyWon) {
                    (uint64 battleCreationTime, uint64 lobbyDuration, uint64 ongoingDuration,) = oldBattle.timing();
                    uint64 battleDuration = lobbyDuration + ongoingDuration;
                    uint64 stunStartTime = battleCreationTime + battleDuration;
                    uint64 stunDuration = uint64(battleDuration * registry().getBattleDurationStunMultiplier() / 1e18);
                    applyStun(stunStartTime, stunDuration);
                }

                emit ExitedFromBattle(oldBattleAddress);
            }
        }

        if (canUpdatePosition()) {
            uint64 movementDuration = movementTiming.endTime - movementTiming.startTime;
            uint64 stunStartTime = movementTiming.endTime;
            uint64 stunDuration = uint64(movementDuration * registry().getMovementDurationStunMultiplier() / 1e18);

            currentPosition = movementPath[movementPath.length - 1];

            movementTiming = MovementTiming({startTime: 0, endTime: 0});
            movementPath = new uint32[](0);
            destinationPosition = 0;

            applyStun(stunStartTime, stunDuration);

            emit UpdatedPosition(address(epoch().settlements(currentPosition)), currentPosition);
        }

        if (stunTiming.endTime != 0 && block.timestamp >= stunTiming.endTime) {
            stunTiming.startTime = 0;
            stunTiming.endTime = 0;
        }
    }

    /// @dev Checks if army can update position at the moment
    function canUpdatePosition() internal view returns (bool) {
        if (movementTiming.endTime != 0 && block.timestamp >= movementTiming.endTime) {
            return true;
        }

        return false;
    }

    /// @inheritdoc IArmy
    function getOwner() public view override returns (address) {
        return currentSettlement.getSettlementOwner();
    }

    /// @inheritdoc IArmy
    function burnUnits(string[] memory unitNames, uint256[] memory unitsCount)
        public
        override
        onlyWorldAssetFromSameEpoch
        onlyActiveGame
    {
        for (uint256 i = 0; i < unitNames.length; i++) {
            if (unitsCount[i] == 0) {
                continue;
            }

            IUnits units = epoch().units(unitNames[i]);
            units.burn(unitsCount[i]);
            emit UnitsChanged(unitNames[i], units.balanceOf(address(this)));
        }
    }

    /// @dev Updates farm's treasury, burns food specified for feeding and returns new path time
    function speedUpArmyBySpendingFood(
        uint256 defaultPathTime,
        uint256 pathLength,
        uint256 foodToSpendOnFeeding
    ) internal returns (uint256) {
        if (foodToSpendOnFeeding == 0) {
            return defaultPathTime;
        }

        uint256 foodAmountToMaximumSpeed = getFoodAmountToMaximumSpeed(pathLength);
        require(foodToSpendOnFeeding <= foodAmountToMaximumSpeed, "exceeded max food amount for maximum speed");

        ISettlement settlementOnPosition = ISettlement(epoch().settlements(currentPosition));
        IBuilding farm = settlementOnPosition.buildings("FARM");
        farm.updateState();

        uint256 farmTreasury = Math.min(
            epoch().resources(farm.getProducingResourceName()).stateBalanceOf(address(farm)),
            farm.getMaxTreasuryByLevel(farm.getBuildingLevel())
        );

        require(farmTreasury >= foodToSpendOnFeeding, "exceeded food amount in treasury");
        farm.burnTreasury(foodToSpendOnFeeding);

        return getDecreasedPathTime(pathLength, defaultPathTime, foodToSpendOnFeeding, foodAmountToMaximumSpeed);
    }

    /// @inheritdoc IArmy
    function move(uint32[] memory path, uint256 foodToSpendOnFeeding)
        public
        override
        onlyActiveGame
        onlyOwnerOrWorldAssetFromSameEpoch
    {
        updateState();

        require(stunTiming.endTime == 0, "army is stunned");
        require(movementTiming.endTime == 0, "cannot move while moving");
        require(address(battle) == address(0), "cannot move while in battle");
        require(address(siege) == address(0), "cannot move while besieging");

        require(world().geography().isNeighborTo(currentPosition, path[0]), "invalid first path position");

        //0 army can't move (you can move only on your settlement hex)
        uint256 totalUnitsCount = getTotalUnitsCount();
        address destinationSettlement = address(epoch().settlements(path[path.length - 1]));
        if (totalUnitsCount == 0 && destinationSettlement != address(currentSettlement)) {
            revert("empty army can move only to home");
        }

        require(destinationSettlement != address(0), "can move only to other settlement");
        require(world().geography().isPathValid(path), "invalid path");

        if (foodToSpendOnFeeding > 0) {
            require(totalUnitsCount > 0, "cannot accelerate empty army");
        }

        uint256 totalPathTime = speedUpArmyBySpendingFood(
            calculateDefaultPathTime(path),
            path.length,
            foodToSpendOnFeeding
        );

        movementTiming = MovementTiming({
            startTime: uint64(block.timestamp),
            endTime: uint64(block.timestamp + totalPathTime)
        });

        movementPath = path;

        destinationPosition = path[path.length - 1];

        emit MovingTo(destinationSettlement, movementTiming.startTime, movementTiming.endTime, path);
    }

    /// @dev Calculates default path time
    function calculateDefaultPathTime(uint32[] memory path) internal returns (uint256) {
        return (5 hours * path.length) / registry().getGlobalMultiplier();
    }

    /// @inheritdoc IArmy
    function demilitarize(string[] memory unitTypes, uint256[] memory unitsAmounts)
        public
        override
        onlyActiveGame
        onlyOwnerOrWorldAssetFromSameEpoch
    {
        updateState();

        uint256 demilitarizationCooldown = registry().getDemilitarizationCooldown() / registry().globalMultiplier();

        require(stunTiming.endTime == 0, "army is stunned");
        require(block.timestamp > lastDemilitarizationTime + demilitarizationCooldown, "demilitarization cooldown");
        require(unitTypes.length == unitsAmounts.length, "invalid input");
        require(address(battle) == address(0), "cannot demilitarize while in battle");

        ISettlement settlementAtPosition = epoch().settlements(getCurrentPosition());
        IZone settlementsZone = settlementAtPosition.currentZone();

        uint256 prosperityForDemilitarization = 0;
        for (uint256 i = 0; i < unitTypes.length; i++) {
            uint256 unitAmount = unitsAmounts[i];
            require(unitAmount > 0 && MathExtension.isIntegerWithPrecision(unitAmount, 1e18), "wrong input");

            prosperityForDemilitarization += unitAmount / 1e18 * registry().getProsperityForDemilitarization(unitTypes[i]);
        }

        this.burnUnits(unitTypes, unitsAmounts);

        // If demilitarization occurs not at cultists position -> we give prosperity to the settlement where army stands
        if (address(settlementsZone.cultistsSettlement()) != address(settlementAtPosition)) {
            ISettlement(settlementAtPosition).extendProsperity(prosperityForDemilitarization);
        }

        lastDemilitarizationTime = block.timestamp;
    }

    /// @dev Calculates decreased path time by feeding parameters
    function getDecreasedPathTime(
        uint256 pathLength,
        uint256 defaultPathTime,
        uint256 foodToSpendOnFeeding,
        uint256 foodAmountToMaximumSpeed
    ) internal returns (uint256) {
        uint256 maxDecreasedPathTime = (defaultPathTime * 1e18 / MathExtension.sqrt(pathLength * 1e18)) / 1e9;
        uint256 delta = defaultPathTime - maxDecreasedPathTime;
        uint256 foodUsage = foodToSpendOnFeeding * 1e18 / foodAmountToMaximumSpeed;

        return defaultPathTime - delta * foodUsage / 1e18;
    }

    /// @dev Calculates amount of needed food for maximum speed increase and amount of max allowed food to spend on feeding
    function getFoodAmountToMaximumSpeed(uint256 pathLength) internal returns (uint256) {
        string[] memory units = registry().getUnits();

        uint256 foodAmountToMaximumSpeed = 0;
        for (uint256 i = 0; i < units.length; i++) {
            uint256 unitsCount = epoch().units(units[i]).balanceOf(address(this));

            foodAmountToMaximumSpeed +=
                (unitsCount / 1e18) *
                registry().getUnitMaxFoodToSpendOnMove(units[i]) *
                pathLength;
        }

        return (foodAmountToMaximumSpeed * MathExtension.sqrt(pathLength * 1e18)) / 1e9;
    }

    /// @dev Calculates current army units balance
    function getTotalUnitsCount() internal view returns (uint256 totalUnitsCount) {
        string[] memory units = registry().getUnits();

        for (uint256 i = 0; i < units.length; i++) {
            totalUnitsCount += epoch().units(units[i]).balanceOf(address(this));
        }
    }

    /// @dev Calculates if provided army has more than specified units
    function isArmyUnitsExceeds(
        address armyAddress,
        string[] calldata unitTypes,
        uint256[] calldata maxUnits
    ) internal view returns (bool) {
        for (uint256 i = 0; i < unitTypes.length; i++) {
            uint256 balance = epoch().units(unitTypes[i]).balanceOf(armyAddress);
            if (balance > maxUnits[i]) {
                return true;
            }
        }

        return false;
    }

    /// @inheritdoc IArmy
    function getCurrentPosition() public view override returns (uint32) {
        if (movementTiming.endTime != 0 && block.timestamp >= movementTiming.endTime) {
            return destinationPosition;
        }

        return currentPosition;
    }

    /// @inheritdoc IArmy
    function setBattle(address battleAddress) public override onlyWorldAssetFromSameEpoch {
        battle = IBattle(battleAddress);
    }

    /// @inheritdoc IArmy
    function newBattle(
        address targetArmyAddress,
        string[] calldata maxUnitTypesToAttack,
        uint256[] calldata maxUnitsToAttack
    )
        public
        override
        onlyActiveGame
        onlyOwnerOrWorldAssetFromSameEpoch
    {
        updateState();
        IArmy targetArmy = IArmy(targetArmyAddress);

        //only target army position is updated because in order to attack, new position is required
        //but in case target army is still in battle then army will exit battle whenever 'joinBattle' is called below
        targetArmy.updateState();
        uint32 targetArmyPosition = targetArmy.getCurrentPosition();

        require(stunTiming.endTime == 0, "army is stunned");
        require(movementTiming.endTime == 0, "cannot attack while moving");
        require(currentPosition == targetArmyPosition, "enemy is not near");
        require(!isArmyUnitsExceeds(targetArmyAddress, maxUnitTypesToAttack, maxUnitsToAttack), "army has grown bigger");

        IBattleFactory battleFactory = IBattleFactory(registry().factoryContracts(keccak256(bytes("battle"))));
        address newBattleAddress = battleFactory.create(
            address(world()),
            epochNumber(),
            "BASIC",
            address(this),
            targetArmyAddress
        );

        emit NewBattle(newBattleAddress, targetArmyAddress);
    }

    /// @inheritdoc IArmy
    function joinBattle(address battleAddress, uint256 side)
        public
        override
        onlyActiveGame
        onlyOwnerOrWorldAssetFromSameEpoch
    {
        updateState();

        // If current army is moving, joinBattle should work only if caller = battle (joins on battle.init)
        if (movementTiming.endTime != 0) {
            require(
                world().worldAssets(epochNumber(), msg.sender) == keccak256(bytes("battle")),
                "cannot join while moving"
            );
        }

        // If current army is stunned, joinBattle should work only if caller = battle (joins on battle.init)
        if (stunTiming.endTime != 0) {
            require(
                world().worldAssets(epochNumber(), msg.sender) == keccak256(bytes("battle")),
                "cannot join battle while stunned"
            );
        }

        require(address(battle) == address(0), "already in battle");
        require(getTotalUnitsCount() > 0, "0 army can't join battle");

        IBattle(battleAddress).acceptArmyInBattle(address(this), side);
        emit JoinedBattle(battleAddress, side);
    }

    /// @inheritdoc IArmy
    function setUnitsInSiege(
        string[] memory _addUnitsNames,
        uint256[] memory _addUnitsCount,
        string[] memory _removeUnitsNames,
        uint256[] memory _removeUnitsCount
    ) public override onlyActiveGame onlyOwnerOrWorldAssetFromSameEpoch {
        updateState();

        require(stunTiming.endTime == 0, "army is stunned");

        withdrawUnitsFromSiege(_removeUnitsNames, _removeUnitsCount);
        startSiege(_addUnitsNames, _addUnitsCount);
    }

    /// @dev Sets specified units in siege
    function startSiege(string[] memory _unitNames, uint256[] memory _unitsCount) internal {
        require(_unitNames.length == _unitsCount.length, "startSiege: invalid input");
        if (_unitsCount.length == 0) {
            return;
        }

        require(movementTiming.endTime == 0, "cannot siege while moving");
        require(address(battle) == address(0), "cannot start siege while in battle");

        address _settlementAddress = address(epoch().settlements(getCurrentPosition()));

        require(_settlementAddress != address(0), "no settlement in current position");
        require(_settlementAddress != address(currentSettlement), "cannot attack own settlement");

        ISettlement settlement = ISettlement(_settlementAddress);
        if (address(settlement.siege()) == address(0)) {
            settlement.createSiege();
        }

        siege = settlement.siege();

        siege.addUnits(_unitNames, _unitsCount);
        require(!siege.canLiquidate(address(this)), "you cannot add unprotected units to the siege");
    }

    /// @dev Withdraws units from siege
    function withdrawUnitsFromSiege(string[] memory _unitNames, uint256[] memory _unitsCount) internal {
        if (_unitsCount.length == 0) {
            return;
        }

        siege.withdrawUnits(_unitNames, _unitsCount);
    }

    /// @inheritdoc IArmy
    function setSiege(address _siegeAddress) public override onlyWorldAssetFromSameEpoch {
        siege = ISiege(_siegeAddress);
    }

    /// @inheritdoc IArmy
    function claimResources(address buildingAddress, uint256 _points)
        public
        override
        onlyActiveGame
        onlyOwnerOrWorldAssetFromSameEpoch
    {
        updateState();
        require(address(siege) != address(0), "no siege");

        siege.claimResources(buildingAddress, _points);
    }

    /// @inheritdoc IArmy
    function getTotalSiegeSupport() public view override returns (uint256 totalSiegeSupport) {
        string[] memory units = registry().getUnits();
        uint256[] memory casualties = new uint256[](units.length);

        if (address(battle) != address(0) && battle.canFinishBattle()) {
            (, casualties) = battle.calculateArmyCasualties(address(this));
        }

        for (uint256 i = 0; i < units.length; i++) {
            string memory unitName = units[i];
            (, , , , , , uint256 siegeSupport) = registry().unitsStats(unitName);

            totalSiegeSupport +=
                ((epoch().units(unitName).balanceOf(address(this)) - casualties[i]) * siegeSupport) /
                1e18;
        }
    }

    /// @inheritdoc IArmy
    function isHomePosition() public view override returns (bool) {
        if (canUpdatePosition()) {
            return destinationPosition == currentSettlement.position();
        }

        return currentPosition == currentSettlement.position();
    }
}
