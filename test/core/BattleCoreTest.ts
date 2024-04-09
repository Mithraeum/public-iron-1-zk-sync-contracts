import { UnitType } from "../enums/unitType";
import {
  Battle__factory,
  CultistsSettlement__factory,
  Zone__factory
} from "../../typechain-types";
import { toBN, toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import BigNumber from "bignumber.js";
import { EvmUtils } from "../helpers/EvmUtils";
import { getNamedAccounts } from "hardhat";
import { UserHelper } from "../helpers/UserHelper";
import { UnitHelper } from "../helpers/UnitHelper";
import { expect } from "chai";
import { BigNumberish } from "ethers";
import { MovementHelper } from "../helpers/MovementHelper";
import { SettlementHelper } from "../helpers/SettlementHelper";
import { ProductionHelper } from "../helpers/ProductionHelper";
import { BuildingType } from "../enums/buildingType";
import { WorldHelper } from "../helpers/WorldHelper";

export type ArmyUnits = { [key in UnitType]: BigNumber };

export class BattleCoreTest {
  public static async joinBattleAndCalculateCasualtiesTest(side: number) {
    const { testUser1, testUser2, testUser3 } = await getNamedAccounts();

    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const unitQuantity = 2;

    const registryInstance = await WorldHelper.getRegistryInstance();

    const unitsStats = await UnitHelper.getUnitsStats(unitTypes);

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);
    const user3SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser3, 1);

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);
    const army3 = await SettlementHelper.getArmy(user3SettlementInstance);

    await army1.newBattle(
      army2.address,
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(unitQuantity)))
    ).then((tx) => tx.wait());

    await army3.joinBattle(await army1.battle(), side).then((tx) => tx.wait());
    const battleInstance = Battle__factory.connect(await army1.battle(), army1.signer);

    const timing = await battleInstance.timing();
    const actualBattleDuration = timing.lobbyDuration.toNumber() + timing.ongoingDuration.toNumber();
    await EvmUtils.increaseTime(actualBattleDuration);

    const army1UnitsBefore = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);
    const army2UnitsBefore = await UnitHelper.getUnitsQuantity(army2.address, unitTypes);
    const army3UnitsBefore = await UnitHelper.getUnitsQuantity(army3.address, unitTypes);

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
    expect(new BigNumber(actualBattleDuration)).eql(expectedBattleDuration);

    const casualtiesPercentSideAStage1 = await sideBStage1TotalWeaponPower.dividedBy(sideAStage1TotalArmourPower);
    const casualtiesPercentSideBStage1 = await sideAStage1TotalWeaponPower.dividedBy(sideBStage1TotalArmourPower);

    side === 1
      ? expect(sideAStage1TotalUnits).to.be.above(sideBStage1TotalUnits, "Side A unit quantity is not correct")
      : expect(sideBStage1TotalUnits).to.be.above(sideAStage1TotalUnits, "Side B unit quantity is not correct");

    const casualtiesSideAStage1 = Object.fromEntries(
        unitTypes.map(unitType => [unitType, sideAUnits[unitType].multipliedBy(casualtiesPercentSideAStage1)])
    );

    const casualtiesSideBStage1 = Object.fromEntries(
        unitTypes.map(unitType => [unitType, sideBUnits[unitType].multipliedBy(casualtiesPercentSideBStage1)])
    );

    const expectedCasualtiesStage1 = await battleInstance.calculateStage1Casualties();

    for (let i = 0; i < unitTypes.length; i++) {
      expect(casualtiesSideAStage1[unitTypes[i]]).eql(toLowBN(expectedCasualtiesStage1._sideACasualties[i]));
      expect(casualtiesSideBStage1[unitTypes[i]]).eql(toLowBN(expectedCasualtiesStage1._sideBCasualties[i]));
    }

    //Stage 2
    //Side A
    const sideAUnitsAfterStage1 = Object.fromEntries(
        unitTypes.map(unitType => [unitType, sideAUnits[unitType].minus(casualtiesSideAStage1[unitType])])
    );

    const sideBUnitsAfterStage1 = Object.fromEntries(
        unitTypes.map(unitType => [unitType, sideBUnits[unitType].minus(casualtiesSideBStage1[unitType])])
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

    const casualtiesPercentSideAStage2 = await sideBStage2TotalWeaponPower.dividedBy(sideAStage2TotalArmourPower);
    const casualtiesPercentSideBStage2 = await sideAStage2TotalWeaponPower.dividedBy(sideBStage2TotalArmourPower);

    const casualtiesSideAStage2 = Object.fromEntries(
        unitTypes.map(unitType => [unitType, sideAUnitsAfterStage1[unitType].multipliedBy(casualtiesPercentSideAStage2)])
    );

    const casualtiesSideBStage2 = Object.fromEntries(
        unitTypes.map(unitType => [unitType, sideBUnitsAfterStage1[unitType].multipliedBy(casualtiesPercentSideBStage2)])
    );

    const casualtiesSideA = Object.fromEntries(
        unitTypes.map(unitType => [unitType, casualtiesSideAStage1[unitType].plus(casualtiesSideAStage2[unitType])])
    );

    const casualtiesSideB = Object.fromEntries(
        unitTypes.map(unitType => [unitType, casualtiesSideBStage1[unitType].plus(casualtiesSideBStage2[unitType])])
    );

    const army1Casualties = Object.fromEntries(
        unitTypes.map(unitType => [unitType, casualtiesSideA[unitType].multipliedBy(army1UnitsBefore[unitType]).dividedBy(sideAUnits[unitType])])
    );

    const army2Casualties = Object.fromEntries(
        unitTypes.map(unitType => [unitType, casualtiesSideB[unitType].multipliedBy(army2UnitsBefore[unitType]).dividedBy(sideBUnits[unitType])])
    );

    const army3Casualties = side === 1
      ? Object.fromEntries(
          unitTypes.map(unitType => [unitType, casualtiesSideA[unitType].multipliedBy(army3UnitsBefore[unitType]).dividedBy(sideAUnits[unitType])])
      )
      : Object.fromEntries(
          unitTypes.map(unitType => [unitType, casualtiesSideB[unitType].multipliedBy(army3UnitsBefore[unitType]).dividedBy(sideBUnits[unitType])])
      );

    const expectedCasualtiesStage2 = await battleInstance.calculateStage2Casualties(expectedCasualtiesStage1._sideACasualties, expectedCasualtiesStage1._sideBCasualties);

    for (let i = 0; i < unitTypes.length; i++) {
      expect(casualtiesSideAStage2[unitTypes[i]]).isInCloseRangeWith(toLowBN(expectedCasualtiesStage2._sideACasualties[i]));
      expect(casualtiesSideBStage2[unitTypes[i]]).isInCloseRangeWith(toLowBN(expectedCasualtiesStage2._sideBCasualties[i]));
    }

    await battleInstance.finishBattle().then((tx) => tx.wait());
    const winningSide = toBN(await battleInstance.winningSide());

    const createExpectedArmy = (
      armyBefore: ArmyUnits,
      armyCasualties: ArmyUnits,
      side: number
    ): ArmyUnits => {
      return Object.fromEntries(
        unitTypes.map(unitType => {
          const unitBeforeMinusCasualties = side === winningSide.toNumber()
            ? armyBefore[unitType].minus(armyCasualties[unitType].integerValue(BigNumber.ROUND_DOWN))
            : armyBefore[unitType].minus(armyCasualties[unitType].integerValue(BigNumber.ROUND_UP));

          return [
            unitType as UnitType,
            unitBeforeMinusCasualties.isNegative() ? new BigNumber(0) : unitBeforeMinusCasualties
          ];
        })
      ) as ArmyUnits;
    };

    const expectedArmy1 = createExpectedArmy(army1UnitsBefore, army1Casualties, 1);
    const expectedArmy2 = createExpectedArmy(army2UnitsBefore, army2Casualties, 2);
    const expectedArmy3 = createExpectedArmy(army3UnitsBefore, army3Casualties, side);

    await army1.updateState().then((tx) => tx.wait());
    await army2.updateState().then((tx) => tx.wait());
    await army3.updateState().then((tx) => tx.wait());

    const actualArmy1Units = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);
    const actualArmy2Units = await UnitHelper.getUnitsQuantity(army2.address, unitTypes);
    const actualArmy3Units = await UnitHelper.getUnitsQuantity(army3.address, unitTypes);

    for (let i = 0; i < unitTypes.length; i++) {
      expect(actualArmy1Units[unitTypes[i]]).eql(expectedArmy1[unitTypes[i]], `Army 1 ${unitTypes[i]} quantity is not correct`);
      expect(actualArmy2Units[unitTypes[i]]).eql(expectedArmy2[unitTypes[i]], `Army 2 ${unitTypes[i]} quantity is not correct`);
      expect(actualArmy3Units[unitTypes[i]]).eql(expectedArmy3[unitTypes[i]], `Army 3 ${unitTypes[i]} quantity is not correct`);
    }
    expect(winningSide).eql(new BigNumber(side), 'Winning side is not correct');

    const battleDurationStunMultiplier = toLowBN(await registryInstance.getBattleDurationStunMultiplier());
    const expectedStunDuration = battleDurationStunMultiplier.multipliedBy(actualBattleDuration);

    const stunTiming = winningSide.toNumber() === 1
      ? await army2.stunTiming()
      : await army1.stunTiming();

    const actualStunDuration = toBN(stunTiming.endTime).minus(toBN(stunTiming.startTime));
    expect(actualStunDuration).eql(expectedStunDuration, 'Stun duration is not correct');
  }

  public static async impossibleJoinBattleDuringStunTest(side: BigNumberish) {
    const { testUser1, testUser2, testUser3 } = await getNamedAccounts();

    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const unitQuantity = 1;
    const maxWeaponQuantity = 1000;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);
    const user3SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser3, 1);

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);
    const army3 = await SettlementHelper.getArmy(user3SettlementInstance);

    await UnitHelper.hireUnits(army1, unitTypes, unitQuantity, maxWeaponQuantity);
    await UnitHelper.hireUnits(army2, unitTypes, unitQuantity, maxWeaponQuantity);
    await UnitHelper.hireUnits(army3, unitTypes, unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army1, await user2SettlementInstance.position(), 0, true);
    await MovementHelper.moveArmy(army3, await user2SettlementInstance.position(), 0, false);

    await army1.newBattle(
      army2.address,
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(unitQuantity)))
    ).then((tx) => tx.wait());

    await expect(
      army3.joinBattle(await army1.battle(), side).then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'cannot join battle while stunned'");
  }

  public static async impossibleBattleDuringStunTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 1;
    const maxWeaponQuantity = 1000;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);

    await UnitHelper.hireUnits(army1, unitTypes, unitQuantity, maxWeaponQuantity);
    await UnitHelper.hireUnits(army2, unitTypes, unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army1, await user2SettlementInstance.position(), 0, false);

    await expect(
      army1.newBattle(
        army2.address,
        unitTypes,
        unitTypes.map(_ => transferableFromLowBN(new BigNumber(unitQuantity)))
      ).then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'army is stunned'");
  }

  public static async battleDrawTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 2;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];

    const registryInstance = await WorldHelper.getRegistryInstance();

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);

    await army1.newBattle(
      army2.address,
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(unitQuantity)))
    ).then((tx) => tx.wait());

    const battleInstance = Battle__factory.connect(await army1.battle(), army1.signer);

    const timing = await battleInstance.timing();
    const battleDuration = timing.lobbyDuration.toNumber() + timing.ongoingDuration.toNumber();
    await EvmUtils.increaseTime(battleDuration);

    const army1UnitsBefore = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);
    const army2UnitsBefore = await UnitHelper.getUnitsQuantity(army2.address, unitTypes);

    for (let i = 0; i < unitTypes.length; i++) {
      expect(army1UnitsBefore[unitTypes[i]]).eql(army2UnitsBefore[unitTypes[i]], `Army ${unitTypes[i]} quantity is not correct`);
    }

    await battleInstance.finishBattle().then((tx) => tx.wait());
    const winningSide = toBN(await battleInstance.winningSide());

    await army1.updateState().then((tx) => tx.wait());
    await army2.updateState().then((tx) => tx.wait());

    const actualArmy1Units = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);
    const actualArmy2Units = await UnitHelper.getUnitsQuantity(army2.address, unitTypes);

    for (let i = 0; i < unitTypes.length; i++) {
      expect(actualArmy1Units[unitTypes[i]]).eql(actualArmy2Units[unitTypes[i]], `Army ${unitTypes[i]} quantity is not correct`);
    }
    expect(winningSide).eql(new BigNumber(0), 'Winning side is not correct');

    const battleDurationStunMultiplier = toLowBN(await registryInstance.getBattleDurationStunMultiplier());
    const expectedStunDuration = battleDurationStunMultiplier.multipliedBy(battleDuration);

    const army1StunTiming = await army1.stunTiming();
    const army2StunTiming = await army2.stunTiming();

    const actualArmy1StunDuration = toBN(army1StunTiming.endTime).minus(toBN(army1StunTiming.startTime));
    const actualArmy2StunDuration = toBN(army2StunTiming.endTime).minus(toBN(army2StunTiming.startTime));

    expect(actualArmy1StunDuration).eql(expectedStunDuration, 'Army 1 stun duration is not correct');
    expect(actualArmy2StunDuration).eql(expectedStunDuration, 'Army 2 stun duration is not correct');
  }

  public static async cultistsBattleWithDifferentArmiesAmountTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const maxWeaponQuantity = 1000;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const toxicityAmount = 10000;

    const registryInstance = await WorldHelper.getRegistryInstance();

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);
    const zoneAddress1 = await user1SettlementInstance.currentZone();
    const zoneAddress2 = await user2SettlementInstance.currentZone();
    const zoneInstance1 = Zone__factory.connect(zoneAddress1, user1SettlementInstance.signer);
    const zoneInstance2 = Zone__factory.connect(zoneAddress2, user2SettlementInstance.signer);

    await ProductionHelper.increaseToxicityBySettlement(user1SettlementInstance, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(user2SettlementInstance, toxicityAmount);

    const summonDelay = toBN(await registryInstance.getCultistsSummonDelay());
    await EvmUtils.increaseTime(summonDelay.toNumber());

    await WorldHelper.summonCultistsInCurrentSettlementZone(user1SettlementInstance);
    await WorldHelper.summonCultistsInCurrentSettlementZone(user2SettlementInstance);

    const cultistUnitAmountBefore1 = await UnitHelper.getCultistsQuantity(zoneInstance1);
    const cultistUnitAmountBefore2 = await UnitHelper.getCultistsQuantity(zoneInstance2);

    expect(cultistUnitAmountBefore1).gt(new BigNumber(0));
    expect(cultistUnitAmountBefore2).gt(new BigNumber(0));

    const cultistsSettlementAddress1 = await zoneInstance1.cultistsSettlement();
    const cultistsSettlementAddress2 = await zoneInstance2.cultistsSettlement();
    const cultistsSettlementInstance1 = CultistsSettlement__factory.connect(cultistsSettlementAddress1, user1SettlementInstance.signer);
    const cultistsSettlementInstance2 = CultistsSettlement__factory.connect(cultistsSettlementAddress2, user2SettlementInstance.signer);
    const cultistUnitType = await registryInstance.getCultistUnitType();

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);

    await UnitHelper.hireUnits(army1, unitTypes, 1, maxWeaponQuantity);
    await UnitHelper.hireUnits(army2, unitTypes, 2, maxWeaponQuantity);

    await MovementHelper.moveArmy(army1, await cultistsSettlementInstance1.position(), 0, true);
    await MovementHelper.moveArmy(army2, await cultistsSettlementInstance2.position(), 0, true);

    await army1.newBattle(
      await cultistsSettlementInstance1.army(),
      [cultistUnitType],
      [transferableFromLowBN(cultistUnitAmountBefore1)]
    ).then((tx) => tx.wait());

    await army2.newBattle(
      await cultistsSettlementInstance2.army(),
      [cultistUnitType],
      [transferableFromLowBN(cultistUnitAmountBefore2)]
    ).then((tx) => tx.wait());

    const battleInstance1 = Battle__factory.connect(await army1.battle(), army1.signer);
    const battleInstance2 = Battle__factory.connect(await army2.battle(), army2.signer);

    const timing1 = await battleInstance1.timing();
    const battleDuration1 = toBN(timing1.lobbyDuration).plus(toBN(timing1.ongoingDuration));

    const timing2 = await battleInstance2.timing();
    const battleDuration2 = toBN(timing2.lobbyDuration).plus(toBN(timing2.ongoingDuration));

    const battleDuration = toBN(await registryInstance.getBaseBattleDuration());
    expect(battleDuration).eql(battleDuration1);
    expect(battleDuration).eql(battleDuration2);
  }

  public static async productionPenaltyReduceAfterCultistsBattleTest() {
    const { testUser1 } = await getNamedAccounts();

    const maxWeaponQuantity = 1000;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const toxicityAmount = 10000;

    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const zoneAddress = await userSettlementInstance.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);

    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance, toxicityAmount);

    const summonDelay = toBN(await registryInstance.getCultistsSummonDelay());
    await EvmUtils.increaseTime(summonDelay.toNumber());
    await zoneInstance.summonCultists().then((tx) => tx.wait());

    const cultistUnitAmountBefore = await UnitHelper.getCultistsQuantity(zoneInstance);
    expect(cultistUnitAmountBefore).gt(new BigNumber(0));

    const expectedProductionSlowdownPercentageBefore = cultistUnitAmountBefore.dividedBy(100);
    const actualProductionSlowdownPercentageBefore = await ProductionHelper.getProductionSlowdownPercentage(userSettlementInstance, BuildingType.SMITHY)

    expect(actualProductionSlowdownPercentageBefore).eql(expectedProductionSlowdownPercentageBefore);

    const cultistsSettlementAddress = await zoneInstance.cultistsSettlement();
    const cultistsSettlementInstance = CultistsSettlement__factory.connect(cultistsSettlementAddress, userSettlementInstance.signer);
    const cultistUnitType = await registryInstance.getCultistUnitType();

    const army = await SettlementHelper.getArmy(userSettlementInstance);
    await UnitHelper.hireUnits(army, unitTypes, 1, maxWeaponQuantity);
    await MovementHelper.moveArmy(army, await cultistsSettlementInstance.position(), 0, true);

    await army.newBattle(
      await cultistsSettlementInstance.army(),
      [cultistUnitType],
      [transferableFromLowBN(cultistUnitAmountBefore)]
    ).then((tx) => tx.wait());

    const battleInstance = Battle__factory.connect(await army.battle(), army.signer);

    const timing = await battleInstance.timing();
    const battleDuration = toBN(timing.lobbyDuration).plus(toBN(timing.ongoingDuration));

    await EvmUtils.increaseTime(battleDuration.toNumber());
    await battleInstance.finishBattle().then((tx) => tx.wait());

    const cultistUnitAmountAfter = await UnitHelper.getCultistsQuantity(zoneInstance);
    expect(cultistUnitAmountAfter).lt(cultistUnitAmountBefore);

    const expectedProductionSlowdownPercentageAfter = cultistUnitAmountAfter.dividedBy(100);
    const actualProductionSlowdownPercentageAfter = await ProductionHelper.getProductionSlowdownPercentage(userSettlementInstance, BuildingType.SMITHY);

    expect(actualProductionSlowdownPercentageAfter).eql(expectedProductionSlowdownPercentageAfter);
    expect(actualProductionSlowdownPercentageAfter).lt(actualProductionSlowdownPercentageBefore);
  }

  public static async siegeEndDuringBattleTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 2;
    const siegeUnitQuantity = unitQuantity / 2;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);

    await army1.setUnitsInSiege(
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity))),
      [],
      []
    ).then(tx => tx.wait());

    await army2.newBattle(
      army1.address,
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(unitQuantity)))
    ).then((tx) => tx.wait());

    const battleInstance = Battle__factory.connect(await army2.battle(), army2.signer);

    const armyUnitsBefore: ArmyUnits = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);
    const armyUnitsInBattleBefore: ArmyUnits = Object.fromEntries(
      await Promise.all(
        unitTypes.map(async unitType => [unitType, toLowBN(await battleInstance.sideUnitsCount(2, unitType))])
      )
    );
    console.log(armyUnitsInBattleBefore);

    await army1.setUnitsInSiege(
      [],
      [],
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity)))
    ).then(tx => tx.wait());

    const armyUnitsAfter = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);
    const armyUnitsInBattleAfter: ArmyUnits = Object.fromEntries(
      await Promise.all(
        unitTypes.map(async unitType => [unitType, toLowBN(await battleInstance.sideUnitsCount(2, unitType))])
      )
    );

    for (let i = 0; i < unitTypes.length; i++) {
      expect(armyUnitsAfter[unitTypes[i]]).eql(armyUnitsBefore[unitTypes[i]].plus(siegeUnitQuantity));
    }
    expect(armyUnitsInBattleAfter).eql(armyUnitsInBattleBefore, 'Unit quantity is not correct');
  }
}
