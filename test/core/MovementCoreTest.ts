import { getNamedAccounts } from "hardhat";
import { Battle__factory } from "../../typechain-types";
import { UserHelper } from "../helpers/UserHelper";
import { toBN, toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import BigNumber from "bignumber.js";
import { EvmUtils } from "../helpers/EvmUtils";
import { expect } from "chai";
import { SettlementHelper } from "../helpers/SettlementHelper";
import { UnitType } from "../enums/unitType";
import { MovementHelper } from "../helpers/MovementHelper";
import { UnitHelper } from "../helpers/UnitHelper";
import { FortHelper } from "../helpers/FortHelper";
import { ResourceHelper } from "../helpers/ResourceHelper";
import { ArmyUnits } from "./BattleCoreTest";
import { WorldHelper } from "../helpers/WorldHelper";

export class MovementCoreTest {
  public static async movementTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 4;
    const maxWeaponQuantity = 1000;

    const registryInstance = await WorldHelper.getRegistryInstance();

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, [UnitType.WARRIOR], unitQuantity, maxWeaponQuantity);

    const nextSettlementPosition = await user2SettlementInstance.position();

    const positionBefore = await army.getCurrentPosition();
    const positionsPath = MovementHelper.getMovementPath(positionBefore, nextSettlementPosition);

    //move to another settlement
    await army.move(positionsPath, 0).then((tx) => tx.wait());
    const expectedMovementTime = MovementHelper.getPathMovementTime(positionsPath);

    const movementTiming = await army.movementTiming();
    const actualMovementTime = toBN(movementTiming.endTime).minus(toBN(movementTiming.startTime)).toNumber();
    expect(actualMovementTime).eql(expectedMovementTime);

    await EvmUtils.increaseTime(expectedMovementTime);

    const movementDurationStunMultiplier = toLowBN(await registryInstance.getMovementDurationStunMultiplier());
    const expectedStunDuration = movementDurationStunMultiplier.multipliedBy(expectedMovementTime);

    await army.updateState().then((tx) => tx.wait());
    const stunTiming = await army.stunTiming();

    const actualArmyPosition = await army.getCurrentPosition();
    const actualStunDuration = toBN(stunTiming.endTime).minus(toBN(stunTiming.startTime));

    expect(actualArmyPosition).eql(nextSettlementPosition, 'Army position is not correct');
    expect(actualStunDuration).eql(expectedStunDuration, 'Stun duration is not correct');
  }

  public static async impossibleMovementDuringStunTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 4;
    const maxWeaponQuantity = 1000;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, [UnitType.WARRIOR], unitQuantity, maxWeaponQuantity);

    const user1SettlementPosition = await user1SettlementInstance.position();
    const user2SettlementPosition = await user2SettlementInstance.position();

    //movement to another settlement
    await MovementHelper.moveArmy(army, user2SettlementPosition, 0, false);

    await expect(
      MovementHelper.moveArmy(army, user1SettlementPosition, 0, true)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'army is stunned'");

    const actualArmyPosition = await army.getCurrentPosition();
    expect(actualArmyPosition).eql(user2SettlementPosition, 'Army position is not correct');
  }

  public static async movementSpeedUpTest(speedUpPercentage: number) {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const unitQuantity = 1;
    const maxWeaponQuantity = 1000;

    const registryInstance = await WorldHelper.getRegistryInstance();

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, unitTypes, unitQuantity, maxWeaponQuantity);

    const user1SettlementPosition = await user1SettlementInstance.position();
    const user2SettlementPosition = await user2SettlementInstance.position();

    const positionBefore = await army.getCurrentPosition();
    const positionsPath = MovementHelper.getMovementPath(positionBefore, user2SettlementPosition);

    //move to another settlement without speed up
    await army.move(positionsPath, 0).then((tx) => tx.wait());
    const pathMovementTime = MovementHelper.getPathMovementTime(positionsPath);
    await EvmUtils.increaseTime(pathMovementTime);

    const positionAfter = await army.getCurrentPosition();
    const positionsHomePath = MovementHelper.getMovementPath(positionAfter, user1SettlementPosition);

    await army.updateState().then((tx) => tx.wait());
    const stunTiming = await army.stunTiming();
    const stunDuration = toBN(stunTiming.endTime).minus(toBN(stunTiming.startTime)).toNumber();
    await EvmUtils.increaseTime(stunDuration);

    //move back to home with speed up
    const foodAmount = await MovementHelper.getFoodAmountForSpeedUp(army, positionsHomePath, new BigNumber(speedUpPercentage).dividedBy(100));
    await army.move(positionsHomePath, transferableFromLowBN(new BigNumber(foodAmount))).then((tx) => tx.wait());
    const movementTiming = await army.movementTiming();
    const actualPathMovementTimeWithSpeedUp = toBN(movementTiming.endTime).minus(toBN(movementTiming.startTime));
    await EvmUtils.increaseTime(actualPathMovementTimeWithSpeedUp.toNumber());
    console.log(foodAmount);

    const speedUpMultiplier = new BigNumber(1).minus(new BigNumber(speedUpPercentage).shiftedBy(-2));
    const pathMovementTimeWithMaxSpeedUp = new BigNumber(pathMovementTime).dividedBy(
      new BigNumber(positionsHomePath.length).sqrt().toFixed(9, 1));
    const pathMovementTimeDifference = new BigNumber(pathMovementTime).minus(pathMovementTimeWithMaxSpeedUp);
    const pathMovementTimeBySpeedUpPercentage = pathMovementTimeDifference.multipliedBy(speedUpMultiplier);
    const expectedPathMovementTimeWithSpeedUp = (pathMovementTimeWithMaxSpeedUp.plus(pathMovementTimeBySpeedUpPercentage)).integerValue(BigNumber.ROUND_DOWN);
    expect(actualPathMovementTimeWithSpeedUp).eql(expectedPathMovementTimeWithSpeedUp, 'Army movement was not speeded up');

    const actualArmyPosition = await army.getCurrentPosition();
    expect(actualArmyPosition).eql(user1SettlementPosition, 'Army position is not correct');

    const movementDurationStunMultiplier = toLowBN(await registryInstance.getMovementDurationStunMultiplier());
    const expectedStunDuration = (movementDurationStunMultiplier.multipliedBy(actualPathMovementTimeWithSpeedUp)).integerValue(BigNumber.ROUND_FLOOR);

    await army.updateState().then((tx) => tx.wait());
    const newStunTiming = await army.stunTiming();
    const actualStunDuration = toBN(newStunTiming.endTime).minus(toBN(newStunTiming.startTime));
    expect(actualStunDuration).eql(expectedStunDuration, 'Stun duration is not correct');
  }

  public static async movementSpeedUpWithLowResourceAmountTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const unitQuantity = 1;
    const maxWeaponQuantity = 1000;
    const foodAmount = 1;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, unitTypes, unitQuantity, maxWeaponQuantity);

    const user1SettlementPosition = await user1SettlementInstance.position();
    const user2SettlementPosition = await user2SettlementInstance.position();

    const positionBefore = await army.getCurrentPosition();
    const positionsPath = MovementHelper.getMovementPath(positionBefore, user2SettlementPosition);

    //move to another settlement without speed up
    await army.move(positionsPath, 0).then((tx) => tx.wait());
    const pathMovementTime = MovementHelper.getPathMovementTime(positionsPath);
    await EvmUtils.increaseTime(pathMovementTime);

    const positionAfter = await army.getCurrentPosition();
    const positionsHomePath = MovementHelper.getMovementPath(positionAfter, user1SettlementPosition);

    //move back to home with speed up
    await army.updateState().then((tx) => tx.wait());
    const stunTiming = await army.stunTiming();
    const stunDuration = toBN(stunTiming.endTime).minus(toBN(stunTiming.startTime)).toNumber();
    await EvmUtils.increaseTime(stunDuration);

    await army.move(positionsHomePath, transferableFromLowBN(new BigNumber(foodAmount))).then((tx) => tx.wait());
    const movementTiming = await army.movementTiming();
    const actualPathMovementTimeWithSpeedUp = toBN(movementTiming.endTime).minus(toBN(movementTiming.startTime));
    await EvmUtils.increaseTime(actualPathMovementTimeWithSpeedUp.toNumber());

    const maxFoodAmount = await MovementHelper.getFoodAmountForSpeedUp(army, positionsHomePath, new BigNumber(1));
    expect(new BigNumber(foodAmount)).lte(maxFoodAmount);

    const foodAmountMultiplier = new BigNumber(1).minus(new BigNumber(foodAmount).dividedBy(maxFoodAmount));
    const pathMovementTimeWithMaxSpeedUp = new BigNumber(pathMovementTime).dividedBy(
      new BigNumber(positionsHomePath.length).sqrt().toFixed(9, 1));
    const pathMovementTimeDifference = new BigNumber(pathMovementTime).minus(pathMovementTimeWithMaxSpeedUp);
    const pathMovementTimeByResource = pathMovementTimeDifference.multipliedBy(foodAmountMultiplier);
    const expectedPathMovementTimeWithSpeedUp = (pathMovementTimeWithMaxSpeedUp.plus(pathMovementTimeByResource)).integerValue(BigNumber.ROUND_UP);
    expect(actualPathMovementTimeWithSpeedUp).eql(expectedPathMovementTimeWithSpeedUp, 'Army movement was not speeded up');

    const actualArmyPosition = await army.getCurrentPosition();
    expect(actualArmyPosition).eql(user1SettlementPosition, 'Army position is not correct');
  }

  public static async impossibleMovementSpeedUpWithoutTreasuryResourceAmountTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 8;
    const siegeUnitQuantity = unitQuantity / 2;
    const maxWeaponQuantity = 1000;
    const unitTypes = [UnitType.WARRIOR];
    const investWorkerQuantity = 2;
    const fortHealth = 8;
    const speedUpPercentage = 100;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    await FortHelper.repairFort(user1SettlementInstance, investWorkerQuantity, new BigNumber(fortHealth));

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, unitTypes, unitQuantity, maxWeaponQuantity);

    const user1SettlementPosition = await user1SettlementInstance.position();
    const user2SettlementPosition = await user2SettlementInstance.position();

    await MovementHelper.moveArmy(army, user2SettlementPosition, 0, true);

    const farm = await SettlementHelper.getFarm(user2SettlementInstance);

    const productionConfig = await farm.getConfig();
    const producingResourceConfig = productionConfig.find(config => config.isProducing);
    const producingResourceName = producingResourceConfig!.resourceName;
    expect(producingResourceConfig).to.exist;

    await army.setUnitsInSiege(
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity))),
      [],
      []
    ).then(tx => tx.wait());

    const fort = await SettlementHelper.getFort(user2SettlementInstance);

    const fortDestructionTime = await FortHelper.getSettlementFortDestructionTime(user2SettlementInstance);
    await EvmUtils.increaseTime(fortDestructionTime.toNumber());

    await fort.updateState().then((tx) => tx.wait());

    const fort2HealthAfter = toLowBN(await fort.health());
    expect(fort2HealthAfter).eql(new BigNumber(0), 'Fort health quantity is not correct');

    await farm.updateState().then((tx) => tx.wait());

    const userBuildingTreasuryBefore = await ResourceHelper.getResourceQuantity(farm.address, producingResourceName);

    const tokenRegenerationTime = await FortHelper.getSettlementFortTokenRegenerationTime(user2SettlementInstance, userBuildingTreasuryBefore.toNumber());
    await EvmUtils.increaseTime(tokenRegenerationTime.toNumber());

    await army.claimResources(farm.address, transferableFromLowBN(userBuildingTreasuryBefore)).then((tx) => tx.wait());

    const actualUserBuildingTreasury = await ResourceHelper.getResourceQuantity(farm.address, producingResourceName);

    await army.setUnitsInSiege(
      [],
      [],
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity)))
    ).then(tx => tx.wait());

    const positionsPath = MovementHelper.getMovementPath(user2SettlementPosition, user1SettlementPosition);
    const foodAmount = await MovementHelper.getFoodAmountForSpeedUp(army, positionsPath, new BigNumber(speedUpPercentage).dividedBy(100));

    expect(actualUserBuildingTreasury).lt(foodAmount);

    await expect(
      MovementHelper.moveArmy(army, user1SettlementPosition, foodAmount.toNumber(), false)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'exceeded food amount in treasury'");
  }

  public static async impossibleMovementSpeedUpDueLimitTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const unitQuantity = 1;
    const maxWeaponQuantity = 1000;
    const speedUpPercentage = 101;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, unitTypes, unitQuantity, maxWeaponQuantity);

    const user2SettlementPosition = await user2SettlementInstance.position();

    const positionBefore = await army.getCurrentPosition();
    const positionsPath = MovementHelper.getMovementPath(positionBefore, user2SettlementPosition);

    const foodAmount = await MovementHelper.getFoodAmountForSpeedUp(army, positionsPath, new BigNumber(speedUpPercentage).dividedBy(100));

    await expect(
      MovementHelper.moveArmy(army, user2SettlementPosition, foodAmount.toNumber(), false)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'exceeded max food amount for maximum speed'");
  }

  public static async impossibleMovementSpeedUpWithEmptyArmyTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 1;
    const maxWeaponQuantity = 1000;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const investWorkerQuantity = 2;
    const fortHealth = 6;
    const speedUpFoodQuantity = 5;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    await FortHelper.repairFort(user2SettlementInstance, investWorkerQuantity, new BigNumber(fortHealth));

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);

    await UnitHelper.hireUnits(army1, unitTypes, unitQuantity, maxWeaponQuantity);
    await UnitHelper.hireUnits(army2, unitTypes, unitQuantity + 1, maxWeaponQuantity);

    await MovementHelper.moveArmy(army1, await user2SettlementInstance.position(), 0, true);

    await army1.newBattle(
      army2.address,
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(unitQuantity + 1)))
    ).then((tx) => tx.wait());

    const battleInstance = Battle__factory.connect(await army1.battle(), army1.signer);

    const timing = await battleInstance.timing();
    const battleDuration = timing.lobbyDuration.toNumber() + timing.ongoingDuration.toNumber();
    await EvmUtils.increaseTime(battleDuration);

    const army1UnitsBefore = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);

    for (let i = 0; i < unitTypes.length; i++) {
      expect(army1UnitsBefore[unitTypes[i]]).not.eql(new BigNumber(0), `Army 1 ${unitTypes[i]} quantity is not correct`);
    }

    await battleInstance.finishBattle().then((tx) => tx.wait());

    await army1.updateState().then((tx) => tx.wait());
    await army2.updateState().then((tx) => tx.wait());

    const actualArmy1Units = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);

    for (let i = 0; i < unitTypes.length; i++) {
      expect(actualArmy1Units[unitTypes[i]]).eql(new BigNumber(0), `Army 1 ${unitTypes[i]} quantity is not correct`);
    }

    const stunTiming = await army1.stunTiming();

    const stunDuration = toBN(stunTiming.endTime).minus(toBN(stunTiming.startTime)).toNumber();
    await EvmUtils.increaseTime(stunDuration);

    await expect(
      MovementHelper.moveArmy(army1, await user1SettlementInstance.position(), speedUpFoodQuantity,  true)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'cannot accelerate empty army'");
  }

  public static async impossibleMovementWithEmptyArmyTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const registryInstance = await WorldHelper.getRegistryInstance();
    const unitTypes = await registryInstance.getUnits();

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);
    const armyUnits = await UnitHelper.getUnitsQuantity(army.address, unitTypes as UnitType[]);

    for (let i = 0; i < unitTypes.length; i++) {
      expect(armyUnits[unitTypes[i]]).eql(new BigNumber(0), `Army ${unitTypes[i]} quantity is not correct`);
    }

    await expect(
      MovementHelper.moveArmy(army, await user2SettlementInstance.position(), 0,  true)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'empty army can move only to home'");
  }

  public static async battleDuringMovementAndCalculateCasualtiesTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 2;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];

    const registryInstance = await WorldHelper.getRegistryInstance();

    const unitsStats = await UnitHelper.getUnitsStats(unitTypes);

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const user1SettlementPosition = await user1SettlementInstance.position();

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);

    const positionBefore = await army1.getCurrentPosition();
    const positionsPath = MovementHelper.getMovementPath(positionBefore, user1SettlementPosition);
    const pathMovementTime = MovementHelper.getPathMovementTime(positionsPath);

    //move to testUser1 settlement
    await army1.move(positionsPath, 0).then((tx) => tx.wait());
    const movementTiming = await army1.movementTiming();

    await EvmUtils.increaseTime(pathMovementTime / 2);

    const actualArmyPosition = await army1.getCurrentPosition();
    expect(actualArmyPosition).not.eql(user1SettlementPosition, 'Army position is not correct');

    await army2.newBattle(
      army1.address,
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(unitQuantity)))
    ).then((tx) => tx.wait());

    const battleInstance = Battle__factory.connect(await army2.battle(), army2.signer);

    const timing = await battleInstance.timing();
    const actualBattleDuration = timing.lobbyDuration.toNumber() + timing.ongoingDuration.toNumber();

    await EvmUtils.increaseTime(actualBattleDuration);

    const battleEndTime = toBN(timing.creationTime).plus(actualBattleDuration);
    expect(battleEndTime).eql(toBN(movementTiming.endTime));

    //Stage 1
    //Side A
    const sideAUnits: ArmyUnits = Object.fromEntries(
      await Promise.all(
        unitTypes.map(async unitType => [unitType, toLowBN(await battleInstance.sideUnitsCount(1, unitType))])
      )
    );

    const sideAStage1TotalUnits = Object.entries(sideAUnits).reduce(
      (total, [unitType, unitsBalance]) => {
        return total.plus(unitsBalance);
      },
      new BigNumber(0)
    );

    const sideAStage1TotalWeaponPower = Object.entries(sideAUnits).reduce(
      (total, [unitType, unitsBalance]) => {
        return total.plus(unitsBalance.multipliedBy(toLowBN(unitsStats[unitType as UnitType].weaponPowerStage1)));
      },
      new BigNumber(0)
    );

    const sideAStage1TotalArmourPower = Object.entries(sideAUnits).reduce(
      (total, [unitType, unitsBalance]) => {
        return total.plus(unitsBalance.multipliedBy(toLowBN(unitsStats[unitType as UnitType].armourPowerStage1)));
      },
      new BigNumber(0)
    );

    //Side B
    const sideBUnits: ArmyUnits = Object.fromEntries(
      await Promise.all(
        unitTypes.map(async unitType => [unitType, toLowBN(await battleInstance.sideUnitsCount(2, unitType))])
      )
    );

    const sideBStage1TotalUnits = Object.entries(sideBUnits).reduce(
      (total, [unitType, unitsBalance]) => {
        return total.plus(unitsBalance);
      },
      new BigNumber(0)
    );

    const sideBStage1TotalWeaponPower = Object.entries(sideBUnits).reduce(
      (total, [unitType, unitsBalance]) => {
        return total.plus(unitsBalance.multipliedBy(toLowBN(unitsStats[unitType as UnitType].weaponPowerStage1)));
      },
      new BigNumber(0)
    );

    const sideBStage1TotalArmourPower = Object.entries(sideBUnits).reduce(
      (total, [unitType, unitsBalance]) => {
        return total.plus(unitsBalance.multipliedBy(toLowBN(unitsStats[unitType as UnitType].armourPowerStage1)));
      },
      new BigNumber(0)
    );

    const sideRatio = sideAStage1TotalUnits < sideBStage1TotalUnits
      ? sideAStage1TotalUnits.dividedBy(sideBStage1TotalUnits)
      : sideBStage1TotalUnits.dividedBy(sideAStage1TotalUnits);
    const battleDurationMultiplier = sideRatio.toNumber() < 0.5 ? sideRatio.toNumber() : 0.5;

    const baseBattleDuration = toBN(await registryInstance.getBaseBattleDuration());
    const expectedBattleDuration = baseBattleDuration.multipliedBy(2 * battleDurationMultiplier);
    expect(actualBattleDuration).to.be.below(expectedBattleDuration.toNumber());

    const durationRatio = actualBattleDuration / expectedBattleDuration.toNumber();

    const casualtiesPercentSideAStage1 = (await sideBStage1TotalWeaponPower.dividedBy(sideAStage1TotalArmourPower)).multipliedBy(durationRatio);
    const casualtiesPercentSideBStage1 = (await sideAStage1TotalWeaponPower.dividedBy(sideBStage1TotalArmourPower)).multipliedBy(durationRatio);

    //Stage 2
    //Side A
    const sideAUnitsAfterStage1 = Object.fromEntries(
        unitTypes.map(unitType => [unitType, sideAUnits[unitType].minus(casualtiesPercentSideAStage1.multipliedBy(sideAUnits[unitType]))])
    );

    const sideBUnitsAfterStage1 = Object.fromEntries(
        unitTypes.map(unitType => [unitType, sideBUnits[unitType].minus(casualtiesPercentSideBStage1.multipliedBy(sideBUnits[unitType]))])
    );

    const sideAStage2TotalWeaponPower = Object.entries(sideAUnitsAfterStage1).reduce(
      (total, [unitType, unitsBalance]) => {
        return total.plus(unitsBalance.multipliedBy(toLowBN(unitsStats[unitType as UnitType].weaponPowerStage2)));
      },
      new BigNumber(0)
    );

    const sideAStage2TotalArmourPower = Object.entries(sideAUnitsAfterStage1).reduce(
      (total, [unitType, unitsBalance]) => {
        return total.plus(unitsBalance.multipliedBy(toLowBN(unitsStats[unitType as UnitType].armourPowerStage2)));
      },
      new BigNumber(0)
    );

    //Side B
    const sideBStage2TotalWeaponPower = Object.entries(sideBUnitsAfterStage1).reduce(
      (total, [unitType, unitsBalance]) => {
        return total.plus(unitsBalance.multipliedBy(toLowBN(unitsStats[unitType as UnitType].weaponPowerStage2)));
      },
      new BigNumber(0)
    );

    const sideBStage2TotalArmourPower = Object.entries(sideBUnitsAfterStage1).reduce(
      (total, [unitType, unitsBalance]) => {
        return total.plus(unitsBalance.multipliedBy(toLowBN(unitsStats[unitType as UnitType].armourPowerStage2)));
      },
      new BigNumber(0)
    );

    const casualtiesPercentSideAStage2 = (await sideBStage2TotalWeaponPower.dividedBy(sideAStage2TotalArmourPower)).multipliedBy(durationRatio);
    const casualtiesPercentSideBStage2 = (await sideAStage2TotalWeaponPower.dividedBy(sideBStage2TotalArmourPower)).multipliedBy(durationRatio);

    const createExpectedArmyUnits = (
      armyBefore: ArmyUnits,
      armyPercentCasualties: BigNumber
    ): ArmyUnits => {
      return Object.fromEntries(
        unitTypes.map(unitType => {
          const unitBeforeMinusCasualties = (armyBefore[unitType]
            .minus(armyPercentCasualties.multipliedBy(armyBefore[unitType]))).integerValue(BigNumber.ROUND_DOWN);

          return [
            unitType as UnitType,
            unitBeforeMinusCasualties.isNegative() ? new BigNumber(0) : unitBeforeMinusCasualties
          ];
        })
      ) as ArmyUnits;
    };

    const expectedArmy1Units = createExpectedArmyUnits(sideAUnitsAfterStage1, casualtiesPercentSideAStage2);
    const expectedArmy2Units = createExpectedArmyUnits(sideBUnitsAfterStage1, casualtiesPercentSideBStage2);

    await battleInstance.finishBattle().then((tx) => tx.wait());

    await army1.updateState().then((tx) => tx.wait());
    await army2.updateState().then((tx) => tx.wait());

    const actualArmy1Units = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);
    const actualArmy2Units = await UnitHelper.getUnitsQuantity(army2.address, unitTypes);

    for (let i = 0; i < unitTypes.length; i++) {
      expect(actualArmy1Units[unitTypes[i]]).eql(expectedArmy1Units[unitTypes[i]], `Army 1 ${unitTypes[i]} quantity is not correct`);
      expect(actualArmy2Units[unitTypes[i]]).eql(expectedArmy2Units[unitTypes[i]], `Army 2 ${unitTypes[i]} quantity is not correct`);
    }
  }
}
