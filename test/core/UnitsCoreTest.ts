import { ethers, getNamedAccounts } from "hardhat";
import { UserHelper } from "../helpers/UserHelper";
import {
  Battle__factory,
  Epoch__factory, IERC20__factory,
  UnitsPool__factory,
  Zone__factory
} from "../../typechain-types";
import { toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import BigNumber from "bignumber.js";
import { expect } from "chai";
import { ResourceHelper } from "../helpers/ResourceHelper";
import { UnitType } from "../enums/unitType";
import { ResourceType } from "../enums/resourceType";
import { SettlementHelper } from "../helpers/SettlementHelper";
import { UnitHelper } from "../helpers/UnitHelper";
import { WorldHelper } from "../helpers/WorldHelper";
import { EvmUtils } from "../helpers/EvmUtils";
import { MovementHelper } from "../helpers/MovementHelper";
import { FortHelper } from "../helpers/FortHelper";
import { ONE_DAY_IN_SECONDS } from "../constants/time";

export class UnitsCoreTest {
  public static async unitsHireWithPriceDropTest(unitType: UnitType, unitQuantity: number) {
    const { testUser1 } = await getNamedAccounts();

    const investWorkerQuantity = 2;
    const maxWeaponQuantity = 1000;
    const priceDropTime = 10;

    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const zoneInstance = Zone__factory.connect(await userSettlementInstance.currentZone(), userSettlementInstance.signer);
    const unitsPoolInstance = UnitsPool__factory.connect(await zoneInstance.unitsPools(unitType), userSettlementInstance.signer);
    const fort = await SettlementHelper.getFort(userSettlementInstance);

    const priceDrop = await registryInstance.getUnitPriceDropByUnitType(unitType);
    const priceDropMultiplier = toLowBN(priceDrop[0]).dividedBy(toLowBN(priceDrop[1]));

    const expectedFortHealth = toLowBN(await fort.getMaxHealthOnLevel(await fort.getBuildingLevel()));

    await FortHelper.repairFort(userSettlementInstance, investWorkerQuantity, expectedFortHealth);

    const actualFortHealth = toLowBN(await fort.health());
    expect(actualFortHealth).eql(expectedFortHealth, 'Fort health quantity is not correct');

    const resourceQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    const unitQuantityBefore = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);

    const unitPriceBeforeDrop = toLowBN((await unitsPoolInstance.getAmountIn(1))[0]);
    const timeBeforeDrop = await EvmUtils.getCurrentTime();

    await EvmUtils.increaseTime(priceDropTime);

    const timeAfterDrop = await EvmUtils.getCurrentTime();
    const passedTime = timeAfterDrop - timeBeforeDrop;

    const expectedUnitPriceAfterDrop = unitPriceBeforeDrop.multipliedBy(priceDropMultiplier.pow(passedTime));

    let unitPriceAfterDrop = toLowBN((await unitsPoolInstance.getAmountIn(1))[0]);
    expect(unitPriceAfterDrop).isInCloseRangeWith(expectedUnitPriceAfterDrop);

    let totalUnitPrice = unitPriceAfterDrop;
    for (let i = 1; i < unitQuantity; i++) {
      unitPriceAfterDrop = unitPriceAfterDrop.plus(unitPriceAfterDrop.multipliedBy(0.004));
      totalUnitPrice = totalUnitPrice.plus(unitPriceAfterDrop);
    }

    const army = await SettlementHelper.getArmy(userSettlementInstance);

    //units hire
    await UnitHelper.hireUnits(army, [unitType], unitQuantity, maxWeaponQuantity);

    const expectedResourceQuantity = resourceQuantityBefore.minus(totalUnitPrice);
    const expectedUnitQuantity = unitQuantityBefore.plus(unitQuantity);
    const expectedUnitPrice = unitPriceAfterDrop.plus(unitPriceAfterDrop.multipliedBy(0.004));

    const actualResourceQuantity = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    const actualUnitQuantity = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);
    const actualUnitPrice = toLowBN((await unitsPoolInstance.getAmountIn(1))[0]);

    expect(actualResourceQuantity).isInCloseRangeWith(expectedResourceQuantity);
    expect(actualUnitQuantity).eql(expectedUnitQuantity, 'Unit quantity is not correct');
    expect(actualUnitPrice).isInCloseRangeWith(expectedUnitPrice);
  }

  public static async unitsHireByAnotherUserResourcesTest(unitType: UnitType, unitQuantity: number) {
    const { testUser1, testUser2 } = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser2);

    const investWorkerQuantity = 2;
    const maxWeaponQuantity = 1000;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const zoneInstance = Zone__factory.connect(await userSettlementInstance.currentZone(), userSettlementInstance.signer);
    const unitsPoolInstance = UnitsPool__factory.connect(await zoneInstance.unitsPools(unitType), userSettlementInstance.signer);
    const fort = await SettlementHelper.getFort(userSettlementInstance);
    const epochInstance = await WorldHelper.getCurrentEpochInstance();

    const expectedFortHealth = toLowBN(await fort.getMaxHealthOnLevel(await fort.getBuildingLevel()));

    await FortHelper.repairFort(userSettlementInstance, investWorkerQuantity, expectedFortHealth);

    const actualFortHealth = toLowBN(await fort.health());
    expect(actualFortHealth).eql(expectedFortHealth, 'Fort health quantity is not correct');

    const resourceQuantityBefore = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.WEAPON);
    const unitQuantityBefore = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);

    let unitPrice = toLowBN((await unitsPoolInstance.getAmountIn(1))[0]);

    let totalUnitPrice = unitPrice;
    for (let i = 1; i < unitQuantity; i++) {
      unitPrice = unitPrice.plus(unitPrice.multipliedBy(0.004));
      totalUnitPrice = totalUnitPrice.plus(unitPrice);
    }

    const tokenAddress = await epochInstance.resources(ResourceType.WEAPON);
    const tokenInstance = IERC20__factory.connect(tokenAddress, signer);
    await tokenInstance.approve(testUser1, transferableFromLowBN(totalUnitPrice)).then((tx) => tx.wait());

    //units hire
    await zoneInstance.buyUnitsBatch(
      testUser2,
      userSettlementInstance.address,
      [unitType],
      [transferableFromLowBN(new BigNumber(unitQuantity))],
      [transferableFromLowBN(new BigNumber(maxWeaponQuantity))]
    ).then(tx => tx.wait());

    const expectedResourceQuantity = resourceQuantityBefore.minus(totalUnitPrice);
    const expectedUnitQuantity = unitQuantityBefore.plus(unitQuantity);
    const expectedUnitPrice = unitPrice.plus(unitPrice.multipliedBy(0.004));

    const actualResourceQuantity = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.WEAPON);
    const actualUnitQuantity = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);
    const actualUnitPrice = toLowBN((await unitsPoolInstance.getAmountIn(1))[0]);

    expect(actualResourceQuantity).isInCloseRangeWith(expectedResourceQuantity);
    expect(actualUnitQuantity).eql(expectedUnitQuantity, 'Unit quantity is not correct');
    expect(actualUnitPrice).isInCloseRangeWith(expectedUnitPrice);
  }

  public static async impossibleUnitsHireByAnotherUserWithoutApproveTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitType = UnitType.WARRIOR;
    const unitQuantity = 2;
    const maxWeaponQuantity = 1000;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const zoneInstance = Zone__factory.connect(await userSettlementInstance.currentZone(), userSettlementInstance.signer);

    await expect(
      zoneInstance.buyUnitsBatch(
        testUser2,
        userSettlementInstance.address,
        [unitType],
        [transferableFromLowBN(new BigNumber(unitQuantity))],
        [transferableFromLowBN(new BigNumber(maxWeaponQuantity))]
      ).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: insufficient allowance'");
  }

  public static async impossibleUnitsHireMoreThanFortHealthAmountTest() {
    const { testUser1 } = await getNamedAccounts();

    const unitType = UnitType.WARRIOR;
    const maxWeaponQuantity = 1000;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const fort = await SettlementHelper.getFort(userSettlementInstance);

    const resourceQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    const unitQuantityBefore = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);

    const army = await SettlementHelper.getArmy(userSettlementInstance);
    await expect(
      UnitHelper.hireUnits(army, [unitType], (toLowBN(await fort.health()).plus(1)).toNumber(), maxWeaponQuantity)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Exceeded limit'");

    const actualResourceQuantity = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    const actualUnitQuantity = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);

    expect(actualResourceQuantity).eql(resourceQuantityBefore, 'Resource quantity is not correct');
    expect(actualUnitQuantity).eql(unitQuantityBefore, 'Unit quantity is not correct');
  }

  public static async impossibleUnitsHireDuringStunTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitType = UnitType.WARRIOR;
    const unitQuantity = 2;
    const maxWeaponQuantity = 1000;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, [unitType], unitQuantity, maxWeaponQuantity);

    const user1SettlementPosition = await user1SettlementInstance.position();
    const user2SettlementPosition = await user2SettlementInstance.position();

    //movement to another settlement
    await MovementHelper.moveArmy(army, user2SettlementPosition, 0, true);

    //movement back to home
    await MovementHelper.moveArmy(army, user1SettlementPosition, 0, false);

    await expect(
      UnitHelper.hireUnits(army, [unitType], unitQuantity, maxWeaponQuantity)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'stunned army cannot hire units'");
  }

  public static async unitsDemilitarizeTest(unitType: UnitType, unitQuantity: number) {
    const { testUser1 } = await getNamedAccounts();

    const maxWeaponQuantity = 1000;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const prosperityForDemilitarization = toLowBN(await registryInstance.getProsperityForDemilitarization(unitType));

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const currentEpochNumber = await WorldHelper.getCurrentEpochNumber();
    const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);
    const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, userSettlementInstance.signer);

    const army = await SettlementHelper.getArmy(userSettlementInstance);

    //units hire
    await UnitHelper.hireUnits(army, [unitType], unitQuantity, maxWeaponQuantity);

    const unitQuantityBefore = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);
    const prosperityBalanceBefore = toLowBN(await prosperityInstance.balanceOf(await currentEpochInstance.settlements(await army.getCurrentPosition())));

    //units demilitarize
    await army.demilitarize(
      [unitType],
      [transferableFromLowBN(new BigNumber(unitQuantity))]
    ).then(tx => tx.wait());

    const expectedUnitQuantity = unitQuantityBefore.minus(unitQuantity);
    const expectedProsperityBalance = prosperityBalanceBefore.plus((prosperityForDemilitarization).multipliedBy(unitQuantity));

    const actualUnitQuantity = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);
    const actualProsperityBalance = toLowBN(await prosperityInstance.balanceOf(await currentEpochInstance.settlements(await army.getCurrentPosition())));

    expect(actualUnitQuantity).eql(expectedUnitQuantity, 'Unit quantity is not correct');
    expect(actualProsperityBalance).eql(expectedProsperityBalance, 'Prosperity balance is not correct');
  }

  public static async unitsDemilitarizeOnAnotherSettlementTest(unitType: UnitType, unitQuantity: number) {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const maxWeaponQuantity = 1000;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const prosperityForDemilitarization = toLowBN(await registryInstance.getProsperityForDemilitarization(unitType));

    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const currentEpochNumber = await WorldHelper.getCurrentEpochNumber();
    const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);
    const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, user1SettlementInstance.signer);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, [unitType], unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army, await user2SettlementInstance.position(), 0, true);

    const unitQuantityBefore = await UnitHelper.getUnitQuantity(await user1SettlementInstance.army(), unitType);
    const prosperityBalanceBefore = toLowBN(await prosperityInstance.balanceOf(await currentEpochInstance.settlements(await army.getCurrentPosition())));

    await army.demilitarize(
      [unitType],
      [transferableFromLowBN(new BigNumber(unitQuantity))]
    ).then(tx => tx.wait());

    const expectedUnitQuantity = unitQuantityBefore.minus(unitQuantity);
    const expectedProsperityBalance = prosperityBalanceBefore.plus((prosperityForDemilitarization).multipliedBy(unitQuantity));

    const actualUnitQuantity = await UnitHelper.getUnitQuantity(await user1SettlementInstance.army(), unitType);
    const actualProsperityBalance = toLowBN(await prosperityInstance.balanceOf(await currentEpochInstance.settlements(await army.getCurrentPosition())));

    expect(actualUnitQuantity).eql(expectedUnitQuantity, 'Unit quantity is not correct');
    expect(actualProsperityBalance).eql(expectedProsperityBalance, 'Prosperity balance is not correct');
  }

  public static async impossibleUnitsDemilitarizeMoreThanAvailableTest() {
    const { testUser1 } = await getNamedAccounts();

    const unitType = UnitType.WARRIOR;
    const unitQuantity = 2;
    const maxWeaponQuantity = 1000;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);

    const army = await SettlementHelper.getArmy(userSettlementInstance);

    //units hire
    await UnitHelper.hireUnits(army, [unitType], unitQuantity, maxWeaponQuantity);

    await expect(
      army.demilitarize(
        [unitType],
        [transferableFromLowBN(new BigNumber(unitQuantity + 1))]
      ).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: burn amount exceeds balance'");
  }

  public static async impossibleUnitsDemilitarizeDuringBattleTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitType = UnitType.WARRIOR;
    const unitQuantity = 2;
    const maxWeaponQuantity = 1000;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);

    await UnitHelper.hireUnits(army1, [unitType], unitQuantity, maxWeaponQuantity);
    await UnitHelper.hireUnits(army2, [unitType], unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army1, await user2SettlementInstance.position(), 0, true);

    await army1.newBattle(
      army2.address,
      [unitType],
      [transferableFromLowBN(new BigNumber(unitQuantity))]
    ).then((tx) => tx.wait());

    await expect(
      army1.demilitarize(
        [unitType],
        [transferableFromLowBN(new BigNumber(unitQuantity))]
      ).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'cannot demilitarize while in battle'");
  }

  public static async impossibleUnitsDemilitarizeDuringStunTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitType = UnitType.WARRIOR;
    const unitQuantity = 2;
    const maxWeaponQuantity = 1000;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, [unitType], unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army, await user2SettlementInstance.position(), 0, false);

    await expect(
      army.demilitarize(
        [unitType],
        [transferableFromLowBN(new BigNumber(unitQuantity))]
      ).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'army is stunned'");
  }

  public static async impossibleUnitsDemilitarizeDuringCooldownTest() {
    const { testUser1 } = await getNamedAccounts();

    const unitType = UnitType.WARRIOR;
    const unitQuantity = 4;
    const maxWeaponQuantity = 1000;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const prosperityForDemilitarization = toLowBN(await registryInstance.getProsperityForDemilitarization(unitType));

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const currentEpochNumber = await WorldHelper.getCurrentEpochNumber();
    const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);
    const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, userSettlementInstance.signer);

    const army = await SettlementHelper.getArmy(userSettlementInstance);

    //units hire
    await UnitHelper.hireUnits(army, [unitType], unitQuantity, maxWeaponQuantity);

    const unitQuantityBefore = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);
    const prosperityBalanceBefore = toLowBN(await prosperityInstance.balanceOf(await currentEpochInstance.settlements(await army.getCurrentPosition())));

    await army.demilitarize(
      [unitType],
      [transferableFromLowBN(new BigNumber(unitQuantity / 2))]
    ).then(tx => tx.wait());

    const expectedUnitQuantity = unitQuantityBefore.minus(unitQuantity / 2);
    const expectedProsperityBalance = prosperityBalanceBefore.plus((prosperityForDemilitarization).multipliedBy(unitQuantity / 2));

    const unitQuantityAfter = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);
    const prosperityBalanceAfter = toLowBN(await prosperityInstance.balanceOf(await currentEpochInstance.settlements(await army.getCurrentPosition())));

    expect(unitQuantityAfter).eql(expectedUnitQuantity, 'Unit quantity is not correct');
    expect(prosperityBalanceAfter).eql(expectedProsperityBalance, 'Prosperity balance is not correct');

    await expect(
      army.demilitarize(
        [unitType],
        [transferableFromLowBN(new BigNumber(unitQuantity / 2))]
      ).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'demilitarization cooldown'");

    const actualUnitQuantity = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);
    const actualProsperityBalance = toLowBN(await prosperityInstance.balanceOf(await currentEpochInstance.settlements(await army.getCurrentPosition())));

    expect(actualUnitQuantity).eql(unitQuantityAfter, 'Unit quantity is not correct');
    expect(actualProsperityBalance).eql(prosperityBalanceAfter, 'Prosperity balance is not correct');
  }

  public static async unitsHireDuringBattleTest(unitType: UnitType) {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const maxWeaponQuantity = 1000;
    const unitQuantity = 1;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);

    await army1.newBattle(
      army2.address,
      [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN],
      [transferableFromLowBN(new BigNumber(2)),
        transferableFromLowBN(new BigNumber(2)),
        transferableFromLowBN(new BigNumber(2))]
    ).then((tx) => tx.wait());

    const battleInstance = Battle__factory.connect(await army1.battle(), army1.signer);

    const unitQuantityBefore = await UnitHelper.getUnitQuantity(await user2SettlementInstance.army(), unitType);
    const unitQuantityInBattleBefore = toLowBN(await battleInstance.sideUnitsCount(2, unitType));

    //units hire
    await UnitHelper.hireUnits(army2, [unitType], unitQuantity, maxWeaponQuantity);

    const expectedUnitQuantity = unitQuantityBefore.plus(unitQuantity);

    const actualUnitQuantity = await UnitHelper.getUnitQuantity(await user2SettlementInstance.army(), unitType);
    const unitQuantityInBattleAfter = toLowBN(await battleInstance.sideUnitsCount(2, unitType));

    expect(actualUnitQuantity).eql(expectedUnitQuantity, 'Unit quantity is not correct');
    expect(unitQuantityInBattleAfter).eql(unitQuantityInBattleBefore, 'Unit quantity in battle is not correct');
  }

  public static async impossibleUnitsHireWithoutResourcesTest() {
    const { testUser1 } = await getNamedAccounts();

    const unitType = UnitType.WARRIOR;
    const maxWeaponQuantity = 1000;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const fort = await SettlementHelper.getFort(userSettlementInstance);

    const resourceQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    const unitQuantityBefore = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);

    const army = await SettlementHelper.getArmy(userSettlementInstance);
    await expect(
      UnitHelper.hireUnits(army, [unitType], (toLowBN(await fort.health())).toNumber(), maxWeaponQuantity)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: burn amount exceeds balance'");

    const actualResourceQuantity = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    const actualUnitQuantity = await UnitHelper.getUnitQuantity(await userSettlementInstance.army(), unitType);

    expect(actualResourceQuantity).eql(resourceQuantityBefore, 'Resource quantity is not correct');
    expect(actualUnitQuantity).eql(unitQuantityBefore, 'Unit quantity is not correct');
  }

  public static async impossibleUnitsHireOnAnotherSettlementTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 1;
    const maxWeaponQuantity = 1000;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army1, unitTypes, unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army1, await user2SettlementInstance.position(), 0, true);

    await expect(
      UnitHelper.hireUnits(army1, unitTypes, unitQuantity, maxWeaponQuantity)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Can hire only on home position'");
  }

  public static async impossibleUnitsHireFromAnotherZoneTest() {
    const { testUser2 } = await getNamedAccounts();

    const unitQuantity = 1;
    const maxWeaponQuantity = 1000;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];

    const userSettlementInstance1 = await UserHelper.getUserSettlementByNumber(testUser2, 1);
    const userSettlementInstance2 = await UserHelper.getUserSettlementByNumber(testUser2, 2);

    const userUnitZone = Zone__factory.connect(await userSettlementInstance2.currentZone(), userSettlementInstance2.signer);
    await expect(
      userUnitZone.buyUnitsBatch(
        ethers.constants.AddressZero.toString(),
        userSettlementInstance1.address,
        unitTypes,
        unitTypes.map(_ => transferableFromLowBN(new BigNumber(unitQuantity))),
        unitTypes.map(_ => transferableFromLowBN(new BigNumber(maxWeaponQuantity)))
      ).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Settlement doesn't belong to this zone'");
  }

  public static async unitsCostBeforeGameStartedTest() {
    const {testUser1} = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser1);

    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const zoneAddress = await epochInstance.zones(1);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer);
    const unitsPoolInstance = UnitsPool__factory.connect(await zoneInstance.unitsPools(UnitType.WARRIOR), signer);

    const unitCost = toLowBN((await unitsPoolInstance.getAmountIn(1))[0]);

    await EvmUtils.increaseTime(100);

    const unitCostBeforeStart = toLowBN((await unitsPoolInstance.getAmountIn(1))[0]);
    expect(unitCostBeforeStart).eql(unitCost);

    await EvmUtils.increaseTime(ONE_DAY_IN_SECONDS);

    const unitCostAfterStart = toLowBN((await unitsPoolInstance.getAmountIn(1))[0]);
    expect(unitCostAfterStart).lt(unitCostBeforeStart);
  }
}
