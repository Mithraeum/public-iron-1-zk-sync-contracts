// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IBattle.sol";
import "../army/IArmy.sol";
import "../../../libraries/MathExtension.sol";
import "../../IRegistry.sol";
import "../WorldAsset.sol";

contract Battle is WorldAsset, IBattle {
    /// @inheritdoc IBattle
    uint32 public override position;
    /// @inheritdoc IBattle
    address[] public override sideA;
    /// @inheritdoc IBattle
    address[] public override sideB;
    /// @inheritdoc IBattle
    mapping(uint256 => mapping(string => uint256)) public override sideUnitsCount;
    /// @inheritdoc IBattle
    mapping(address => mapping(string => uint256)) public override armyUnitsCount;
    /// @inheritdoc IBattle
    mapping(uint256 => mapping(string => uint256)) public override casualties;
    /// @inheritdoc IBattle
    mapping(address => uint256) public override armySide;
    /// @inheritdoc IBattle
    Timing public override timing;
    /// @inheritdoc IBattle
    uint256 public override winningSide;

    /// @inheritdoc IBattle
    function init(
        address attackerArmyAddress,
        address attackedArmyAddress
    ) public override initializer {
        IArmy attackerArmy = IArmy(attackerArmyAddress);
        IArmy attackedArmy = IArmy(attackedArmyAddress);

        position = attackerArmy.getCurrentPosition();

        timing.creationTime = uint64(block.timestamp);

        ISettlement settlementOnBattlePosition = epoch().settlements(position);
        address cultistsArmy = address(settlementOnBattlePosition.currentZone().cultistsSettlement().army());
        bool isCultistsAttacked = attackedArmyAddress == cultistsArmy;

        (,uint64 movementEndTime) = attackedArmy.movementTiming();

        uint256 maxBattleDuration = 0;
        if (movementEndTime != 0 && movementEndTime > timing.creationTime) {
            maxBattleDuration = movementEndTime - timing.creationTime;
        }

        (uint64 lobbyDuration, uint64 ongoingDuration) = getTimings(
            isCultistsAttacked,
            maxBattleDuration,
            calculateUnitsCount(attackerArmyAddress),
            calculateUnitsCount(attackedArmyAddress)
        );

        timing.lobbyDuration = lobbyDuration;
        timing.ongoingDuration = ongoingDuration;

        attackerArmy.joinBattle(address(this), 1);
        attackedArmy.joinBattle(address(this), 2);
    }

    /// @inheritdoc IBattle
    function getSideALength() public view override returns (uint256) {
        return sideA.length;
    }

    /// @inheritdoc IBattle
    function getSideBLength() public view override returns (uint256) {
        return sideB.length;
    }

    /// @inheritdoc IBattle
    function isLobbyTime() public view override returns (bool) {
        uint256 lobbyEndTime = timing.creationTime + timing.lobbyDuration;
        return block.timestamp >= timing.creationTime && block.timestamp < lobbyEndTime;
    }

    /// @inheritdoc IBattle
    function acceptArmyInBattle(
        address armyAddress,
        uint256 side
    ) public override onlyWorldAssetFromSameEpoch onlyActiveGame {
        require(side == 1 || side == 2, "invalid side");
        require(isLobbyTime(), "not a lobby time");
        IArmy army = IArmy(armyAddress);

        require(position == army.currentPosition(), "invalid position");

        string[] memory units = registry().getUnits();

        for (uint256 i = 0; i < units.length; i++) {
            string memory unitName = units[i];
            uint256 unitCount = epoch().units(unitName).balanceOf(address(army));

            sideUnitsCount[side][unitName] += unitCount;
            armyUnitsCount[armyAddress][unitName] += unitCount;
        }

        if (side == 1) {
            sideA.push(armyAddress);
        } else if (side == 2) {
            sideB.push(armyAddress);
        } else {
            revert("invalid state");
        }

        armySide[armyAddress] = side;

        army.setBattle(address(this));

        if (getSideALength() > 0 && getSideBLength() > 0) {
            calculateAndSaveCasualties();
        }

        emit ArmyJoined(armyAddress, side);
    }

    /// @inheritdoc IBattle
    function canFinishBattle() public view override returns (bool) {
        return timing.creationTime > 0 && block.timestamp >= timing.creationTime + timing.lobbyDuration + timing.ongoingDuration;
    }

    /// @inheritdoc IBattle
    function isFinishedBattle() public view override returns (bool) {
        return timing.finishTime != 0;
    }

    /// @inheritdoc IBattle
    function removeArmyFromBattle(address armyAddress) public override onlyActiveGame onlyWorldAssetFromSameEpoch {
        require(isFinishedBattle(), "battle still in process");

        IArmy army = IArmy(armyAddress);

        (, uint256[] memory unitsCount) = calculateArmyCasualties(armyAddress);

        // It is important for 'setBattle' be after 'burnUnits' because
        // burnUnits will trigger zone.updateState and zone.updateState rely on army.battle in order to properly save its time
        army.burnUnits(registry().getUnits(), unitsCount);
        army.setBattle(address(0));
    }

    /// @inheritdoc IBattle
    function calculateArmyCasualties(address armyAddress)
        public
        view
        override
        returns (bool, uint256[] memory)
    {
        uint256 side = armySide[armyAddress];

        require(side == 1 || side == 2, "wrong army address");

        string[] memory units = registry().getUnits();

        uint256[] memory result = new uint256[](units.length);

        bool isArmyWon = side == winningSide;

        for (uint256 i = 0; i < units.length; i++) {
            string memory unitName = units[i];

            uint256 _sideUnitsCount = sideUnitsCount[side][unitName];
            uint256 _armyUnitsCount = armyUnitsCount[armyAddress][unitName];

            if (_sideUnitsCount == 0 || _armyUnitsCount == 0) {
                continue;
            }

            uint256 percent = (_armyUnitsCount * 1e18) / _sideUnitsCount;
            uint256 sideUnitsCasualties = side == 1
                ? casualties[1][unitName]
                : casualties[2][unitName];

            uint256 userCasualties = (sideUnitsCasualties * percent) / 1e18;

            if (userCasualties == 0) {
                continue;
            }

            uint256 integerUserCasualties = MathExtension.roundDownWithPrecision(userCasualties, 1e18);
            if (!isArmyWon) {
                uint256 roundedUpIntegerUserCasualties = MathExtension.roundUpWithPrecision(userCasualties, 1e18);
                integerUserCasualties = _armyUnitsCount >= roundedUpIntegerUserCasualties
                    ? roundedUpIntegerUserCasualties
                    : integerUserCasualties;
            }

            result[i] = integerUserCasualties;
        }

        return (isArmyWon, result);
    }

    /// @inheritdoc IBattle
    function calculateTimings(
        uint256 globalMultiplier,
        uint256 baseBattleDuration,
        uint256 battleLobbyDurationPercent,
        bool isCultistsAttacked,
        uint256 units1,
        uint256 units2,
        uint256 maxBattleDuration
    ) public view override returns (uint64, uint64) {
        require(units1 != 0 && units2 != 0, "can't attack 0 army");

        uint64 battleDuration = uint64(baseBattleDuration / globalMultiplier);
        if (!isCultistsAttacked) {
            if (units1 >= units2 && units1 / units2 > 1) {
                battleDuration = uint64(battleDuration * 2 * units2 / units1);
            }

            if (units2 > units1 && units2 / units1 > 1) {
                battleDuration = uint64(battleDuration * 2 * units1 / units2);
            }
        }

        if (maxBattleDuration != 0 && maxBattleDuration < battleDuration) {
            battleDuration = uint64(maxBattleDuration);
        }

        uint64 lobbyDuration = uint64(battleDuration * battleLobbyDurationPercent / 1e18);
        return (lobbyDuration, battleDuration - lobbyDuration);
    }

    /// @inheritdoc IBattle
    function getTimings(
        bool isCultistsAttacked,
        uint256 maxBattleDuration,
        uint256 sideAUnitsCount,
        uint256 sideBUnitsCount
    ) public view override returns (uint64, uint64) {
        uint256 globalMultiplier = registry().getGlobalMultiplier();
        uint256 baseBattleDuration = registry().getBaseBattleDuration();
        uint256 battleLobbyDurationPercent = registry().getBattleLobbyDurationPercent();

        return calculateTimings(
            globalMultiplier,
            baseBattleDuration,
            battleLobbyDurationPercent,
            isCultistsAttacked,
            sideAUnitsCount,
            sideBUnitsCount,
            maxBattleDuration
        );
    }

    /// @inheritdoc IBattle
    function finishBattle() public override onlyActiveGame {
        require(
            block.timestamp >= timing.creationTime + timing.lobbyDuration + timing.ongoingDuration,
            "wait for starting time"
        );
        require(!isFinishedBattle(), "cannot finish battle again");

        timing.finishTime = uint64(timing.creationTime + timing.lobbyDuration + timing.ongoingDuration);

        emit BattleFinished(timing.finishTime);

        // In case if battle is finished on cultists position & cultists are in this battle => update cultists army state
        ISettlement settlementOnThisPosition = epoch().settlements(position);
        string memory settlementAssetType = IWorldAssetStorageAccessor(address(settlementOnThisPosition)).assetType();

        if (
            keccak256(bytes(settlementAssetType)) == keccak256(bytes("CULTISTS"))
            && address(settlementOnThisPosition.army().battle()) == address(this)
        ) {
            settlementOnThisPosition.army().updateState();
        }
    }

    /// @dev Calculates and saves casualties
    function calculateAndSaveCasualties() internal {
        (
            uint256[] memory _sideACasualties,
            uint256[] memory _sideBCasualties,
            uint256 _winningSide
        ) = calculateAllCasualties();

        string[] memory units = registry().getUnits();

        for (uint256 i = 0; i < units.length; i++) {
            string memory unitName = units[i];

            casualties[1][unitName] = _sideACasualties[i];
            casualties[2][unitName] = _sideBCasualties[i];
        }

        winningSide = _winningSide;
    }

    /// @inheritdoc IBattle
    function calculateStage1Casualties()
        public
        view
        override
        returns (
            uint256[] memory _sideACasualties,
            uint256[] memory _sideBCasualties,
            bytes memory stageParams
        )
    {
        string[] memory units = registry().getUnits();

        _sideACasualties = new uint256[](units.length);
        _sideBCasualties = new uint256[](units.length);

        uint256 sideAOffense;
        uint256 sideBOffense;

        uint256 sideADefence;
        uint256 sideBDefence;

        // 1st stage
        for (uint256 i = 0; i < units.length; i++) {
            string memory unitName = units[i];

            (uint256 weaponPowerStage1, uint256 armourPowerStage1, , , , , ) = registry().unitsStats(unitName);

            sideAOffense += sideUnitsCount[1][unitName] * weaponPowerStage1 * 1e18;
            sideBOffense += sideUnitsCount[2][unitName] * weaponPowerStage1 * 1e18;

            sideADefence += sideUnitsCount[1][unitName] * armourPowerStage1 * 1e18;
            sideBDefence += sideUnitsCount[2][unitName] * armourPowerStage1 * 1e18;
        }

        stageParams = abi.encode(sideAOffense, sideBOffense, sideADefence, sideBDefence);

        uint256 sideALossPercentageAfterStage1 = calculateSideLossPercentage(
            sideBOffense,
            sideADefence,
            timing.lobbyDuration + timing.ongoingDuration,
            registry().getBaseBattleDuration() / registry().getGlobalMultiplier()
        );

        uint256 sideBLossPercentageAfterStage1 = calculateSideLossPercentage(
            sideAOffense,
            sideBDefence,
            timing.lobbyDuration + timing.ongoingDuration,
            registry().getBaseBattleDuration() / registry().getGlobalMultiplier()
        );

        // 2nd stage
        for (uint256 i = 0; i < units.length; i++) {
            string memory unitName = units[i];

            uint256 sideAUnitsLost = (sideUnitsCount[1][unitName] * sideALossPercentageAfterStage1) / 1e18;
            if (sideAUnitsLost > sideUnitsCount[1][unitName]) {
                _sideACasualties[i] = sideUnitsCount[1][unitName];
            } else {
                _sideACasualties[i] = sideAUnitsLost;
            }

            uint256 sideBUnitsLost = (sideUnitsCount[2][unitName] * sideBLossPercentageAfterStage1) / 1e18;
            if (sideBUnitsLost > sideUnitsCount[2][unitName]) {
                _sideBCasualties[i] = sideUnitsCount[2][unitName];
            } else {
                _sideBCasualties[i] = sideBUnitsLost;
            }
        }
    }

    /// @inheritdoc IBattle
    function calculateStage2Casualties(
        uint256[] memory stage1SideACasualties,
        uint256[] memory stage1SideBCasualties
    )
        public
        view
        override
        returns (
            uint256[] memory _sideACasualties,
            uint256[] memory _sideBCasualties,
            bytes memory stageParams
        )
    {
        string[] memory units = registry().getUnits();

        _sideACasualties = new uint256[](units.length);
        _sideBCasualties = new uint256[](units.length);

        uint256 sideAOffense;
        uint256 sideBOffense;

        uint256 sideADefence;
        uint256 sideBDefence;

        for (uint256 i = 0; i < units.length; i++) {
            string memory unitName = units[i];

            (, , uint256 weaponPowerStage2, uint256 armourPowerStage2, , , ) = registry().unitsStats(unitName);

            uint256 unitsARemaining = sideUnitsCount[1][unitName] - stage1SideACasualties[i];
            uint256 unitsBRemaining = sideUnitsCount[2][unitName] - stage1SideBCasualties[i];

            sideAOffense += unitsARemaining * weaponPowerStage2 * 1e18;
            sideBOffense += unitsBRemaining * weaponPowerStage2 * 1e18;

            sideADefence += unitsARemaining * armourPowerStage2 * 1e18;
            sideBDefence += unitsBRemaining * armourPowerStage2 * 1e18;
        }

        stageParams = abi.encode(sideAOffense, sideBOffense, sideADefence, sideBDefence);

        // In case if no units left in either side -> no stage 2 casualties
        if (sideADefence == 0 || sideBDefence == 0) {
            return (
                _sideACasualties,
                _sideBCasualties,
                stageParams
            );
        }

        uint256 sideALossPercentageAfterStage2 = calculateSideLossPercentage(
            sideBOffense,
            sideADefence,
            timing.lobbyDuration + timing.ongoingDuration,
            registry().getBaseBattleDuration() / registry().getGlobalMultiplier()
        );

        uint256 sideBLossPercentageAfterStage2 = calculateSideLossPercentage(
            sideAOffense,
            sideBDefence,
            timing.lobbyDuration + timing.ongoingDuration,
            registry().getBaseBattleDuration() / registry().getGlobalMultiplier()
        );

       // result
       for (uint256 i = 0; i < units.length; i++) {
           string memory unitName = units[i];

           {
               uint256 sideAUnits = sideUnitsCount[1][unitName] - stage1SideACasualties[i];
               uint256 sideAUnitsLost = (sideAUnits * sideALossPercentageAfterStage2) / 1e18;
               if (sideAUnitsLost >= sideAUnits) {
                   _sideACasualties[i] = sideAUnits;
               } else {
                   _sideACasualties[i] = sideAUnitsLost;
               }
           }

           {
               uint256 sideBUnits = sideUnitsCount[2][unitName] - stage1SideBCasualties[i];
               uint256 sideBUnitsLost = (sideBUnits * sideBLossPercentageAfterStage2) / 1e18;
               if (sideBUnitsLost >= sideBUnits) {
                   _sideBCasualties[i] = sideBUnits;
               } else {
                   _sideBCasualties[i] = sideBUnitsLost;
               }
           }
       }
    }

    /// @dev Calculates winning side by side-stage params
    function calculateWinningSide(
        bytes memory stage1Params,
        bytes memory stage2Params
    ) internal view returns (uint256) {
        (
            uint256 stage1SideAOffence,
            uint256 stage1SideBOffence,
            uint256 stage1SideADefence,
            uint256 stage1SideBDefence
        ) = abi.decode(stage1Params, (uint256, uint256, uint256, uint256));

        (
            uint256 stage2SideAOffence,
            uint256 stage2SideBOffence,
            uint256 stage2SideADefence,
            uint256 stage2SideBDefence
        ) = abi.decode(stage2Params, (uint256, uint256, uint256, uint256));

        uint256 winningSide = 0;

        // Loss coefficient split in 2 because, for example, in 1st stage there could be no units left in either side
        // And this means -> no second stage
        uint256 sideALossCoefficient = stage1SideBOffence * 1e18 / stage1SideADefence;
        uint256 sideBLossCoefficient = stage1SideAOffence * 1e18 / stage1SideBDefence;

        if (stage2SideADefence > 0 && stage2SideBDefence > 0) {
            sideALossCoefficient += stage2SideBOffence * 1e18 / stage2SideADefence;
            sideBLossCoefficient += stage2SideAOffence * 1e18 / stage2SideBDefence;
        }

        if (sideALossCoefficient > sideBLossCoefficient) {
            winningSide = 2;
        }

        if (sideALossCoefficient < sideBLossCoefficient) {
            winningSide = 1;
        }

        return winningSide;
    }

    /// @inheritdoc IBattle
    function calculateAllCasualties()
        public
        view
        override
        returns (
            uint256[] memory,
            uint256[] memory,
            uint256 //Winning side (0 - both sides lost, 1 - side A Won, 2 - side B Won
        )
    {
        //calculate stage1 casualties (based on initial sides)
        (
            uint256[] memory stage1SideACasualties,
            uint256[] memory stage1SideBCasualties,
            bytes memory stage1Params
        ) = calculateStage1Casualties();

        //calculate stage2 casualties (based on (initial-stage1Losses))
        (
            uint256[] memory stage2SideACasualties,
            uint256[] memory stage2SideBCasualties,
            bytes memory stage2Params
        ) = calculateStage2Casualties(
            stage1SideACasualties,
            stage1SideBCasualties
        );

        uint256 winningSide = calculateWinningSide(
            stage1Params,
            stage2Params
        );

        uint256[] memory sideACasualties = new uint256[](stage1SideACasualties.length);
        uint256[] memory sideBCasualties = new uint256[](stage1SideACasualties.length);

        for (uint256 i = 0; i < stage1SideACasualties.length; i++) {
            sideACasualties[i] = stage1SideACasualties[i] + stage2SideACasualties[i];
            sideBCasualties[i] = stage1SideBCasualties[i] + stage2SideBCasualties[i];
        }

        return (sideACasualties, sideBCasualties, winningSide);
    }

    /// @dev Calculate side loss percentage (in 1e18 precision)
    function calculateSideLossPercentage(
        uint256 sideOffence,
        uint256 sideDefence,
        uint256 battleDuration,
        uint256 baseBattleDuration
    ) internal pure returns (uint256) {
        uint256 loweredByBattleTimeOffence = (sideOffence * battleDuration) / baseBattleDuration;
        return (loweredByBattleTimeOffence * 1e18) / sideDefence;
    }

    /// @dev Calculates total amount of units of specified army
    function calculateUnitsCount(address armyAddress) internal view returns (uint256 unitsCount) {
        string[] memory units = registry().getUnits();

        for (uint256 i = 0; i < units.length; i++) {
            string memory unitName = units[i];
            unitsCount += epoch().units(unitName).balanceOf(armyAddress);
        }

        return unitsCount;
    }
}
