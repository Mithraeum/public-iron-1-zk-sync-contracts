import { ethers, getNamedAccounts } from "hardhat";
import { UnitHelper } from "../helpers/UnitHelper";
import { UserHelper } from "../helpers/UserHelper";
import {
  Battle__factory,
  Siege__factory
} from "../../typechain-types";
import { toBN, toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import BigNumber from "bignumber.js";
import { SettlementHelper } from "../helpers/SettlementHelper";
import { EvmUtils } from "../helpers/EvmUtils";
import { UnitType } from "../enums/unitType";
import { expect } from "chai";
import { ResourceHelper } from "../helpers/ResourceHelper";
import { ResourceType } from "../enums/resourceType";
import { MovementHelper } from "../helpers/MovementHelper";
import { FortHelper } from "../helpers/FortHelper";
import { BuildingType } from "../enums/buildingType";
import { ProductionHelper } from "../helpers/ProductionHelper";
import { BuildingHelper } from "../helpers/BuildingHelper";
import { WorldHelper } from "../helpers/WorldHelper";

export class SiegeCoreTest {
  public static async armyLiquidationDuringSiegeTest() {
    const { testUser1, testUser2, testUser3 } = await getNamedAccounts();
    const signer3 = await ethers.getSigner(testUser3);

    const unitQuantity = 2;
    const siegeUnitQuantity = unitQuantity / 2;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const investWorkerQuantity = 2;
    const fortHealth = 6;
    const maxWeaponQuantity = 1000;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);

    await FortHelper.repairFort(user1SettlementInstance, investWorkerQuantity, new BigNumber(fortHealth));
    await FortHelper.repairFort(user2SettlementInstance, investWorkerQuantity, new BigNumber(fortHealth));

    await UnitHelper.hireUnits(army1, unitTypes, unitQuantity, maxWeaponQuantity);
    await UnitHelper.hireUnits(army2, unitTypes, unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army1, await user2SettlementInstance.position(), 0, true);

    await army1.setUnitsInSiege(
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity))),
      [],
      []
    ).then(tx => tx.wait());

    const siegeInstance = Siege__factory.connect(await army1.siege(), signer3);

    const armyUnitsBefore = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);
    const siegeArmyUnitsBefore = await UnitHelper.getUnitsQuantity(siegeInstance.address, unitTypes);
    for (let i = 0; i < unitTypes.length; i++) {
      expect(armyUnitsBefore[unitTypes[i]]).not.eql(new BigNumber(0), `Army ${unitTypes[i]} quantity in battle is not correct`);
      expect(siegeArmyUnitsBefore[unitTypes[i]]).not.eql(new BigNumber(0), `Army ${unitTypes[i]} quantity in siege is not correct`);
    }
    expect(await siegeInstance.canLiquidate(army1.address)).to.be.false;

    await army2.newBattle(
      army1.address,
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(unitQuantity)))
    ).then((tx) => tx.wait());

    const battleInstance = Battle__factory.connect(await army2.battle(), army2.signer);
    const timing = await battleInstance.timing();
    const actualBattleDuration = timing.lobbyDuration.toNumber() + timing.ongoingDuration.toNumber();
    await EvmUtils.increaseTime(actualBattleDuration);
    await battleInstance.finishBattle().then((tx) => tx.wait());

    await army1.updateState().then((tx) => tx.wait());
    await army2.updateState().then((tx) => tx.wait());

    const armyUnitsBeforeLiquidation = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);
    const siegeArmyUnitsBeforeLiquidation = await UnitHelper.getUnitsQuantity(siegeInstance.address, unitTypes);
    for (let i = 0; i < unitTypes.length; i++) {
      expect(armyUnitsBeforeLiquidation[unitTypes[i]]).eql(new BigNumber(0), `Army ${unitTypes[i]} quantity in battle is not correct`);
      expect(siegeArmyUnitsBeforeLiquidation[unitTypes[i]]).not.eql(new BigNumber(0), `Army ${unitTypes[i]} quantity in siege is not correct`);
    }
    expect(await siegeInstance.canLiquidate(army1.address)).to.be.true;

    await siegeInstance.liquidate(army1.address).then(tx => tx.wait());

    const armyUnitsAfterLiquidation = await UnitHelper.getUnitsQuantity(army1.address, unitTypes);
    const siegeArmyUnitsAfterLiquidation = await UnitHelper.getUnitsQuantity(siegeInstance.address, unitTypes);
    for (let i = 0; i < unitTypes.length; i++) {
      expect(armyUnitsAfterLiquidation[unitTypes[i]]).eql(new BigNumber(0), `Army ${unitTypes[i]} quantity in battle is not correct`);
      expect(siegeArmyUnitsAfterLiquidation[unitTypes[i]]).eql(new BigNumber(0), `Army ${unitTypes[i]} quantity in siege is not correct`);
    }
  }

  public static async impossibleSiegeDuringStunTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 4;
    const siegeUnitQuantity = unitQuantity / 2;
    const maxWeaponQuantity = 1000;
    const unitTypes = [UnitType.WARRIOR];

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, unitTypes, unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army, await user2SettlementInstance.position(), 0, false);

    await expect(
      army.setUnitsInSiege(
        unitTypes,
        unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity))),
        [],
        []
      ).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'army is stunned'");
  }

  public static async robberyTest(buildingType: BuildingType) {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitTypes = [UnitType.WARRIOR];
    const unitQuantity = 4;
    const siegeUnitQuantity = unitQuantity / 2;
    const maxWeaponQuantity = 1000;
    const investResourceQuantity = 100;
    const exchangeTokens = 10;

    const registryInstance = await WorldHelper.getRegistryInstance();

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(user2SettlementInstance, buildingType);

    const productionConfig = await buildingInstance.getConfig();
    const spendingResourceConfigs = productionConfig.filter(config => !config.isProducing);
    const producingResourceConfig = productionConfig.find(config => config.isProducing);
    const producingResourceName = producingResourceConfig!.resourceName;
    expect(producingResourceConfig).to.exist;

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, unitTypes, unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army, await user2SettlementInstance.position(), 0, true);

    await user2SettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      buildingInstance.address,
      transferableFromLowBN(new BigNumber(1)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    await army.setUnitsInSiege(
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity))),
      [],
      []
    ).then(tx => tx.wait());

    const siegeInstance = Siege__factory.connect(await army.siege(), army.signer);

    const fort2 = await SettlementHelper.getFort(user2SettlementInstance);
    const fortDestructionTime = await FortHelper.getSettlementFortDestructionTime(user2SettlementInstance);
    await EvmUtils.increaseTime(fortDestructionTime.toNumber());

    await fort2.updateState().then((tx) => tx.wait());

    const fort2HealthAfter = toLowBN(await fort2.health());
    expect(fort2HealthAfter).eql(new BigNumber(0), 'Fort 2 health quantity is not correct');

    const robberyFee = toLowBN(await registryInstance.getRobberyFee());

    let robberyTokensCap = new BigNumber(0);
    for (let i = 0; i < unitTypes.length; i++) {
      robberyTokensCap = robberyTokensCap.plus(toLowBN((await UnitHelper.getUnitStats(unitTypes[i])).siegeMaxSupply).multipliedBy(siegeUnitQuantity));
    }

    const tokenRegenerationTime = await FortHelper.getSettlementFortTokenRegenerationTime(user2SettlementInstance, robberyTokensCap.toNumber());
    await EvmUtils.increaseTime(tokenRegenerationTime.toNumber());

    await buildingInstance.updateState().then((tx) => tx.wait());

    const robberyTokensBefore = toLowBN(await siegeInstance.getUserPoints(army.address));
    const user1ResourceBefore = await ResourceHelper.getResourceQuantity(testUser1, producingResourceName);
    const user2BuildingTreasuryBefore = await ResourceHelper.getResourceQuantity(buildingInstance.address, producingResourceName);

    expect(robberyTokensBefore).eql(robberyTokensCap, 'Robbery token quantity is not correct');

    const expectedRobberyTokens = robberyTokensBefore.minus(exchangeTokens);

    await army.claimResources(buildingInstance.address, transferableFromLowBN(new BigNumber(exchangeTokens))).then((tx) => tx.wait());

    const actualRobberyTokens = toLowBN(await siegeInstance.getUserPoints(army.address));
    const actualUser1Resource = await ResourceHelper.getResourceQuantity(testUser1, producingResourceName);
    const actualUser2BuildingTreasury = await ResourceHelper.getResourceQuantity(buildingInstance.address, producingResourceName);

    expect(actualRobberyTokens).eql(expectedRobberyTokens, 'Robbery token quantity is not correct');
    expect(actualUser1Resource).eql(user1ResourceBefore.plus((new BigNumber(1).minus(robberyFee)).multipliedBy(exchangeTokens)), 'User 1 resource quantity is not correct');
    expect(actualUser2BuildingTreasury).eql(user2BuildingTreasuryBefore.minus(exchangeTokens), 'User 2 building treasury quantity is not correct');

    await army.setUnitsInSiege(
      [],
      [],
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity)))
    ).then(tx => tx.wait());

    const robberyTokensAfterSiege = toLowBN(await siegeInstance.getUserPoints(army.address));
    expect(robberyTokensAfterSiege).eql(new BigNumber(0), 'Robbery token quantity after siege is not correct');
  }

  public static async impossibleRobberyWithoutRobberyTokensTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitTypes = [UnitType.WARRIOR];
    const unitQuantity = 4;
    const siegeUnitQuantity = unitQuantity / 2;
    const maxWeaponQuantity = 1000;
    const investResourceQuantity = 100;
    const exchangeTokens = 10;
    const buildingType = BuildingType.SMITHY;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(user2SettlementInstance, buildingType);

    const productionConfig = await buildingInstance.getConfig();
    const spendingResourceConfigs = productionConfig.filter(config => !config.isProducing);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, unitTypes, unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army, await user2SettlementInstance.position(), 0, true);

    await user2SettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      buildingInstance.address,
      transferableFromLowBN(new BigNumber(1)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    await army.setUnitsInSiege(
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity))),
      [],
      []
    ).then(tx => tx.wait());

    const siegeInstance = Siege__factory.connect(await army.siege(), army.signer);

    const fort = await SettlementHelper.getFort(user2SettlementInstance);
    const fortDestructionTime = await FortHelper.getSettlementFortDestructionTime(user2SettlementInstance);
    await EvmUtils.increaseTime(fortDestructionTime.toNumber());

    await fort.updateState().then((tx) => tx.wait());

    const fortHealth = toLowBN(await fort.health());
    expect(fortHealth).eql(new BigNumber(0), 'Fort health quantity is not correct');

    await buildingInstance.updateState().then((tx) => tx.wait());

    const robberyTokensBefore = toLowBN(await siegeInstance.getUserPoints(army.address));
    expect(robberyTokensBefore).lt(new BigNumber(exchangeTokens), 'Robbery token quantity is not correct');

    await expect(
      army.claimResources(buildingInstance.address, transferableFromLowBN(new BigNumber(exchangeTokens))).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'not enough points'");
  }

  public static async fortRepairmentTest() {
    const { testUser1 } = await getNamedAccounts();

    const investWorkerQuantity = 2;
    const investResourceQuantity = 100;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);

    const fort = await SettlementHelper.getFort(userSettlementInstance);

    const productionConfig = await fort.getConfig();
    const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const fortHealthBeforeRepairment = toLowBN(await fort.health());
    const expectedFortHealth = toLowBN(await fort.getMaxHealthOnLevel(await fort.getBuildingLevel()));
    expect(fortHealthBeforeRepairment).lt(expectedFortHealth, 'Fort health quantity is not correct');

    const buildingLastUpdateStateTimeAfterSiege = toBN((await fort.production()).lastUpdateStateTime);

    await userSettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      fort.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    const buildingProductionMultiplier = toLowBN(await fort.getWorkers());
    const basicProductionMultiplier = await ProductionHelper.getBasicProductionMultiplier(userSettlementInstance, BuildingType.FORT);
    const fortRegenerationPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy((buildingProductionMultiplier));
    const fortPassiveRegenerationPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy(basicProductionMultiplier);
    const totalRegenerationPerSecond = fortRegenerationPerSecond.plus(fortPassiveRegenerationPerSecond);

    const fortRepairmentTime = (expectedFortHealth.dividedBy(totalRegenerationPerSecond)).integerValue(BigNumber.ROUND_CEIL);
    const buildingResourceBeforeRepairment = await ResourceHelper.getResourcesQuantity(
      fort.address,
      spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    const buildingLastUpdateStateTimeBefore = toBN((await fort.production()).lastUpdateStateTime);

    await EvmUtils.increaseTime((fortRepairmentTime.dividedBy(2).integerValue(BigNumber.ROUND_CEIL)).toNumber());
    await fort.updateState().then((tx) => tx.wait());

    const buildingLastUpdateStateTimeAfter = toBN((await fort.production()).lastUpdateStateTime);

    const timePassed = buildingLastUpdateStateTimeAfter.minus(buildingLastUpdateStateTimeBefore);
    const timePassedFromSiege = buildingLastUpdateStateTimeAfter.minus(buildingLastUpdateStateTimeAfterSiege);
    const fortHealthAfterPassiveRepairment = fortHealthBeforeRepairment.plus(fortPassiveRegenerationPerSecond.multipliedBy(timePassedFromSiege));
    const expectedFortHealthAfterRepairment = fortHealthAfterPassiveRepairment.plus(fortRegenerationPerSecond.multipliedBy(timePassed));

    const fortHealthAfterRepairment = toLowBN(await fort.health());
    expect(fortHealthAfterRepairment).isInCloseRangeWith(expectedFortHealthAfterRepairment);

    await EvmUtils.increaseTime((fortRepairmentTime.dividedBy(2).integerValue(BigNumber.ROUND_CEIL)).toNumber());
    await fort.updateState().then((tx) => tx.wait());

    const actualFortHealth = toLowBN(await fort.health());
    const buildingResourceAfterRepairment = await ResourceHelper.getResourcesQuantity(
      fort.address,
      spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    expect(actualFortHealth).eql(expectedFortHealth, 'Fort health quantity is not correct');

    for (let i = 0; i < spendingResourceConfigs.length; i++) {
      expect(buildingResourceBeforeRepairment[spendingResourceConfigs[i].resourceName]).to.be.above(
        buildingResourceAfterRepairment[spendingResourceConfigs[i].resourceName]);
    }

    await EvmUtils.increaseTime(10);

    const actualBuildingResource = await ResourceHelper.getResourcesQuantity(
      fort.address,
      spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );
    expect(actualBuildingResource).eql(buildingResourceAfterRepairment, 'Building resource quantity is not correct');
  }

  public static async fortDestructionTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 2;
    const siegeUnitQuantity = unitQuantity / 2;
    const maxWeaponQuantity = 1000;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const investWorkerQuantity = 2;
    const fortHealth = 6;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await FortHelper.repairFort(user1SettlementInstance, investWorkerQuantity, new BigNumber(fortHealth));
    await UnitHelper.hireUnits(army, unitTypes, unitQuantity, maxWeaponQuantity);
    await MovementHelper.moveArmy(army, await user2SettlementInstance.position(), 0, true);

    await army.setUnitsInSiege(
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity))),
      [],
      []
    ).then(tx => tx.wait());

    const fort2 = await SettlementHelper.getFort(user2SettlementInstance);
    const productionConfig = await fort2.getConfig();
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const siegeInstance = Siege__factory.connect(await army.siege(), army.signer);

    let totalSiegePowerPerSecond = 0;
    for (let i = 0; i < unitTypes.length; i++) {
      totalSiegePowerPerSecond += siegeUnitQuantity * toLowBN((await UnitHelper.getUnitStats(unitTypes[i])).siegePower).toNumber();
    }

    const basicProductionMultiplier = await ProductionHelper.getBasicProductionMultiplier(user2SettlementInstance, BuildingType.FORT);
    const fortPassiveRegenerationPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy(basicProductionMultiplier);

    const fortHealthBeforeSiege = toLowBN(await fort2.health());
    const fortDestructionPerSecond = new BigNumber(totalSiegePowerPerSecond).minus(fortPassiveRegenerationPerSecond);
    const fortDestructionTime = (fortHealthBeforeSiege.dividedBy(fortDestructionPerSecond)).integerValue(BigNumber.ROUND_CEIL);

    const buildingLastUpdateStateTimeBefore = toBN((await fort2.production()).lastUpdateStateTime);

    await EvmUtils.increaseTime((fortDestructionTime.dividedBy(2).integerValue(BigNumber.ROUND_CEIL)).toNumber());
    await fort2.updateState().then((tx) => tx.wait());

    const buildingLastUpdateStateTimeAfter = toBN((await fort2.production()).lastUpdateStateTime);

    const timePassed = buildingLastUpdateStateTimeAfter.minus(buildingLastUpdateStateTimeBefore);

    const fortHealthAfterSiege = toLowBN(await fort2.health());
    const robberyTokensDuringSiege = toLowBN(await siegeInstance.getUserPoints(army.address));

    expect(fortHealthAfterSiege).eql(fortHealthBeforeSiege.minus(fortDestructionPerSecond.multipliedBy(timePassed)));
    expect(robberyTokensDuringSiege).eql(new BigNumber(0));

    await EvmUtils.increaseTime((fortDestructionTime.dividedBy(2).integerValue(BigNumber.ROUND_CEIL)).toNumber());
    await fort2.updateState().then((tx) => tx.wait());

    const actualFortHealth = toLowBN(await fort2.health());
    const actualRobberyTokens = toLowBN(await siegeInstance.getUserPoints(army.address));

    expect(actualFortHealth).eql(new BigNumber(0));
    expect(actualRobberyTokens).to.be.above(new BigNumber(0));
  }

  public static async fortRepairmentDuringSiegeTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 2;
    const siegeUnitQuantity = unitQuantity / 2;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const maxWeaponQuantity = 1000;
    const investWorkerQuantity = 4;
    const investResourceQuantity = 200;
    const fortHealth = 6;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await FortHelper.repairFort(user1SettlementInstance, investWorkerQuantity, new BigNumber(fortHealth));
    await UnitHelper.hireUnits(army, unitTypes, unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army, await user2SettlementInstance.position(), 0, true);

    //fort destruction
    await army.setUnitsInSiege(
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity))),
      [],
      []
    ).then(tx => tx.wait());

    const fort2 = await SettlementHelper.getFort(user2SettlementInstance);

    const productionConfig = await fort2.getConfig();
    const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const fortDestructionTime = await FortHelper.getSettlementFortDestructionTime(user2SettlementInstance);
    await EvmUtils.increaseTime(fortDestructionTime.toNumber());

    await fort2.updateState().then((tx) => tx.wait());

    const fortHealthAfterDestruction = toLowBN(await fort2.health());
    expect(fortHealthAfterDestruction).eql(new BigNumber(0), 'Fort 2 health quantity is not correct');

    //fort repairment
    await user2SettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      fort2.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    const buildingProductionMultiplier = toLowBN(await fort2.getWorkers());
    const basicProductionMultiplier = await ProductionHelper.getBasicProductionMultiplier(user2SettlementInstance, BuildingType.FORT);
    const fortRegenerationPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy((buildingProductionMultiplier));
    const fortPassiveRegenerationPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy(basicProductionMultiplier);
    const totalRegenerationPerSecond = fortRegenerationPerSecond.plus(fortPassiveRegenerationPerSecond);

    let totalSiegePowerPerSecond = 0;
    for (let i = 0; i < unitTypes.length; i++) {
      totalSiegePowerPerSecond += siegeUnitQuantity * toLowBN((await UnitHelper.getUnitStats(unitTypes[i])).siegePower).toNumber();
    }

    const realRegenerationPerSecond = totalRegenerationPerSecond.minus(totalSiegePowerPerSecond);

    const maxFortHealth = toLowBN(await fort2.getMaxHealthOnLevel(await fort2.getBuildingLevel()));
    const fortRepairmentTime = (maxFortHealth.dividedBy(realRegenerationPerSecond)).integerValue(BigNumber.ROUND_CEIL);

    //first half fort repairment
    const buildingResourceBeforeRepairment = await ResourceHelper.getResourcesStateBalanceOf(
      fort2.address,
      spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    const buildingLastUpdateStateTimeBeforeFirstHalfFortRepairment = toBN((await fort2.production()).lastUpdateStateTime);
    await EvmUtils.increaseTime(fortRepairmentTime.dividedBy(2).integerValue(BigNumber.ROUND_CEIL).toNumber());
    await fort2.updateState().then((tx) => tx.wait());
    const buildingLastUpdateStateTimeAfterFirstHalfFortRepairment = toBN((await fort2.production()).lastUpdateStateTime);
    const timePassedDuringFirstHalfFortRepairment = buildingLastUpdateStateTimeAfterFirstHalfFortRepairment.minus(buildingLastUpdateStateTimeBeforeFirstHalfFortRepairment);

    const fortHealthAfterFirstHalfRepairment = toLowBN(await fort2.health());
    expect(fortHealthAfterFirstHalfRepairment).eql(fortHealthAfterDestruction.plus(realRegenerationPerSecond.multipliedBy(timePassedDuringFirstHalfFortRepairment)));

    //second half fort repairment
    await EvmUtils.increaseTime((fortRepairmentTime.minus(fortRepairmentTime.dividedBy(2).integerValue(BigNumber.ROUND_CEIL))).toNumber());
    await fort2.updateState().then((tx) => tx.wait());

    const fortHealthAfterRepairment = toLowBN(await fort2.health());
    const buildingResourceAfterRepairment = await ResourceHelper.getResourcesStateBalanceOf(
      fort2.address,
      spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    expect(fortHealthAfterRepairment).eql(maxFortHealth, 'Fort 2 health quantity is not correct');

    for (let i = 0; i < spendingResourceConfigs.length; i++) {
      expect(buildingResourceBeforeRepairment[spendingResourceConfigs[i].resourceName]).to.be.above(
        buildingResourceAfterRepairment[spendingResourceConfigs[i].resourceName]);
    }

    let calculateProductionTicksAmount = new BigNumber("Infinity");
    for (let i = 0; i < spendingResourceConfigs.length; i++) {
      calculateProductionTicksAmount = BigNumber.min(buildingResourceAfterRepairment[spendingResourceConfigs[i].resourceName].dividedBy(toLowBN(spendingResourceConfigs[i].perTick)), calculateProductionTicksAmount);
    }

    const toBeProducedValue = toLowBN(producingResourceConfig!.perTick).multipliedBy(calculateProductionTicksAmount);
    const timeToResourcesGone = toBeProducedValue.dividedBy((new BigNumber(totalSiegePowerPerSecond).minus(fortPassiveRegenerationPerSecond)));

    //first half fort repairment with max health
    const buildingLastUpdateStateTimeBeforeFirstHalfFortRepairmentWithMaxHealth = toBN((await fort2.production()).lastUpdateStateTime);
    const firstHalfRepairmentTime = (timeToResourcesGone.integerValue(BigNumber.ROUND_FLOOR).dividedBy(2)).integerValue(BigNumber.ROUND_FLOOR);
    await EvmUtils.increaseTime(firstHalfRepairmentTime.toNumber());
    await fort2.updateState().then((tx) => tx.wait());
    const buildingLastUpdateStateTimeAfterFirstHalfFortRepairmentWithMaxHealth = toBN((await fort2.production()).lastUpdateStateTime);
    const timePassedDuringFistHalfFortRepairmentWithMaxHealth = buildingLastUpdateStateTimeAfterFirstHalfFortRepairmentWithMaxHealth.minus(buildingLastUpdateStateTimeBeforeFirstHalfFortRepairmentWithMaxHealth);

    const ticksPerSecond = ((new BigNumber(totalSiegePowerPerSecond).minus(fortPassiveRegenerationPerSecond)).dividedBy(toLowBN(producingResourceConfig!.perTick))).integerValue(BigNumber.ROUND_CEIL);
    const totalTicksThatHaveToBeProducedDuringFistHalfFortRepairmentWithMaxHealth = ticksPerSecond.multipliedBy(timePassedDuringFistHalfFortRepairmentWithMaxHealth);

    const buildingResourceAfterFirstHalfFortRepairmentWithMaxHealth = await ResourceHelper.getResourcesStateBalanceOf(
      fort2.address,
      spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    expect(fortHealthAfterRepairment).eql(maxFortHealth, 'Fort 2 health quantity is not correct');

    for (let i = 0; i < spendingResourceConfigs.length; i++) {
      const resourceType = spendingResourceConfigs[i].resourceName;
      expect(buildingResourceAfterFirstHalfFortRepairmentWithMaxHealth[resourceType]).eql(buildingResourceAfterRepairment[resourceType].minus(totalTicksThatHaveToBeProducedDuringFistHalfFortRepairmentWithMaxHealth.multipliedBy(toLowBN(spendingResourceConfigs[i].perTick))));
    }

    //second half fort repairment with max health
    const secondHalfRepairmentTime = timeToResourcesGone.integerValue(BigNumber.ROUND_FLOOR).minus(firstHalfRepairmentTime);
    await EvmUtils.increaseTime(secondHalfRepairmentTime.toNumber());
    await fort2.updateState().then((tx) => tx.wait());

    const timePassedDuringSecondHalfFortRepairmentWithMaxHealth = timeToResourcesGone.integerValue(BigNumber.ROUND_FLOOR).minus(timePassedDuringFistHalfFortRepairmentWithMaxHealth);
    const totalTicksThatHaveToBeProducedDuringSecondHalfFortRepairmentWithMaxHealth = ticksPerSecond.multipliedBy(timePassedDuringSecondHalfFortRepairmentWithMaxHealth);

    const buildingResourceAfterSecondHalfFortRepairmentWithMaxHealth = await ResourceHelper.getResourcesStateBalanceOf(
      fort2.address,
      spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    for (let i = 0; i < spendingResourceConfigs.length; i++) {
      const resourceType = spendingResourceConfigs[i].resourceName;
      expect(buildingResourceAfterSecondHalfFortRepairmentWithMaxHealth[resourceType]).isInCloseRangeWith(
        (buildingResourceAfterFirstHalfFortRepairmentWithMaxHealth[resourceType].minus(totalTicksThatHaveToBeProducedDuringSecondHalfFortRepairmentWithMaxHealth.multipliedBy(toLowBN(spendingResourceConfigs[i].perTick)))));
    }

    //fort destruction after resources gone
    await EvmUtils.increaseTime(10);
    await fort2.updateState().then((tx) => tx.wait());

    const actualBuildingResource = await ResourceHelper.getResourcesQuantity(
      fort2.address,
      spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    const actualFortHealth = toLowBN(await fort2.health());
    expect(actualFortHealth).to.be.below(maxFortHealth, 'Fort 2 health quantity is not correct');

    for (let i = 0; i < spendingResourceConfigs.length; i++) {
      const resourceType = spendingResourceConfigs[i].resourceName;
      expect(buildingResourceAfterSecondHalfFortRepairmentWithMaxHealth[resourceType]).eql(actualBuildingResource[resourceType]);
    }
  }

  public static async fortDestructionDuringRepairmentTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 2;
    const siegeUnitQuantity = unitQuantity / 2;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const maxWeaponQuantity = 1000;
    const investWorkerQuantity = 1;
    const investResourceQuantity = 200;
    const fortHealth = 6;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await FortHelper.repairFort(user1SettlementInstance, investWorkerQuantity, new BigNumber(fortHealth));
    await UnitHelper.hireUnits(army, unitTypes, unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army, await user2SettlementInstance.position(), 0, true);

    const farm2 = await SettlementHelper.getFarm(user2SettlementInstance);

    const farm2ProductionConfig = await farm2.getConfig();
    const farm2SpendingResourceConfigs = farm2ProductionConfig.filter((config) => !config.isProducing);

    //testUser2 resource investment into farm
    await user2SettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      farm2.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      farm2SpendingResourceConfigs.map((value) => value.resourceName),
      farm2SpendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity / 2)))
    ).then(tx => tx.wait());

    const fort2 = await SettlementHelper.getFort(user2SettlementInstance);

    const fort2ProductionConfig = await fort2.getConfig();
    const fort2SpendingResourceConfigs = fort2ProductionConfig.filter((config) => !config.isProducing);
    const fort2ProducingResourceConfig = fort2ProductionConfig.find((config) => config.isProducing);
    expect(fort2ProducingResourceConfig).to.exist;

    const fortHealthBeforeRepairment = toLowBN(await fort2.health());

    //fort repairment
    await user2SettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      fort2.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      fort2SpendingResourceConfigs.map((value) => value.resourceName),
      fort2SpendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    const buildingProductionMultiplier = toLowBN(await fort2.getWorkers());
    const basicProductionMultiplier = await ProductionHelper.getBasicProductionMultiplier(user2SettlementInstance, BuildingType.FORT);
    const fortRegenerationPerSecond = toLowBN(fort2ProducingResourceConfig!.perTick).multipliedBy(buildingProductionMultiplier);
    const fortPassiveRegenerationPerSecond = toLowBN(fort2ProducingResourceConfig!.perTick).multipliedBy(basicProductionMultiplier);
    const totalRegenerationPerSecond = fortRegenerationPerSecond.plus(fortPassiveRegenerationPerSecond);

    const maxFortHealth = toLowBN(await fort2.getMaxHealthOnLevel(await fort2.getBuildingLevel()));
    const fortRepairmentTime = ((maxFortHealth.minus(fortHealthBeforeRepairment)).dividedBy(totalRegenerationPerSecond)).integerValue(BigNumber.ROUND_CEIL);
    await EvmUtils.increaseTime(fortRepairmentTime.toNumber());
    await fort2.updateState().then((tx) => tx.wait());

    const fortHealthAfterRepairment = toLowBN(await fort2.health());
    expect(fortHealthAfterRepairment).eql(maxFortHealth, 'Fort 2 health quantity is not correct');

    await army.setUnitsInSiege(
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity))),
      [],
      []
    ).then(tx => tx.wait());

    const siegeInstance = Siege__factory.connect(await army.siege(), army.signer);

    let totalSiegePowerPerSecond = 0;
    for (let i = 0; i < unitTypes.length; i++) {
      totalSiegePowerPerSecond += siegeUnitQuantity * toLowBN((await UnitHelper.getUnitStats(unitTypes[i])).siegePower).toNumber();
    }

    const realDestructionPerSecond = new BigNumber(totalSiegePowerPerSecond).minus(totalRegenerationPerSecond);
    const fortDestructionTime = (fortHealthAfterRepairment.dividedBy(realDestructionPerSecond)).integerValue(BigNumber.ROUND_CEIL);

    const buildingResourceBeforeDestruction = await ResourceHelper.getResourcesStateBalanceOf(
      fort2.address,
      fort2SpendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    //first half destruction
    const buildingLastUpdateStateTimeBeforeFirstHalfDestruction = toBN((await fort2.production()).lastUpdateStateTime);
    await EvmUtils.increaseTime((fortDestructionTime.integerValue(BigNumber.ROUND_CEIL).dividedBy(2)).integerValue(BigNumber.ROUND_CEIL).toNumber());
    await fort2.updateState().then((tx) => tx.wait());
    const buildingLastUpdateStateTimeAfterFirstHalfDestruction = toBN((await fort2.production()).lastUpdateStateTime);
    const timePassedDuringFirstHalfDestruction = buildingLastUpdateStateTimeAfterFirstHalfDestruction.minus(buildingLastUpdateStateTimeBeforeFirstHalfDestruction);

    const fortHealthAfterFirstHalfDestruction = toLowBN(await fort2.health());
    expect(fortHealthAfterFirstHalfDestruction).eql(fortHealthAfterRepairment.minus(realDestructionPerSecond.multipliedBy(timePassedDuringFirstHalfDestruction)));

    //second half fort destruction
    await EvmUtils.increaseTime((fortDestructionTime.minus(fortDestructionTime.dividedBy(2).integerValue(BigNumber.ROUND_CEIL))).toNumber());
    await fort2.updateState().then((tx) => tx.wait());

    const tokensAfterSecondHalfDestruction = toLowBN(await siegeInstance.getUserPoints(army.address));

    const fortHealthAfterSecondHalfDestruction = toLowBN(await fort2.health());
    expect(fortHealthAfterSecondHalfDestruction).eql(new BigNumber(0), 'Fort 2 health quantity is not correct');

    const buildingLastUpdateStateTimeBeforeDestructionWithResource = toBN((await fort2.production()).lastUpdateStateTime);
    await EvmUtils.increaseTime(((fortDestructionTime.dividedBy(50).integerValue(BigNumber.ROUND_CEIL))).toNumber());
    await fort2.updateState().then((tx) => tx.wait());
    const buildingLastUpdateStateTimeAfterDestructionWithResource = toBN((await fort2.production()).lastUpdateStateTime);
    const timePassedDuringDestructionWithResource = buildingLastUpdateStateTimeAfterDestructionWithResource.minus(buildingLastUpdateStateTimeBeforeDestructionWithResource);

    const tokensAfterDestructionWithResource = toLowBN(await siegeInstance.getUserPoints(army.address));
    const tokensRegenPerSecondWithResource = (tokensAfterDestructionWithResource.minus(tokensAfterSecondHalfDestruction)).dividedBy(timePassedDuringDestructionWithResource);

    const buildingResourceAfterDestruction = await ResourceHelper.getResourcesStateBalanceOf(
      fort2.address,
      fort2SpendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    for (let i = 0; i < fort2SpendingResourceConfigs.length; i++) {
      expect(buildingResourceBeforeDestruction[fort2SpendingResourceConfigs[i].resourceName]).to.be.above(
        buildingResourceAfterDestruction[fort2SpendingResourceConfigs[i].resourceName]);
    }

    let calculateProductionTicksAmount = new BigNumber("Infinity");
    for (let i = 0; i < fort2SpendingResourceConfigs.length; i++) {
      calculateProductionTicksAmount = BigNumber.min(buildingResourceAfterDestruction[fort2SpendingResourceConfigs[i].resourceName].dividedBy(toLowBN(fort2SpendingResourceConfigs[i].perTick)), calculateProductionTicksAmount);
    }

    const toBeProducedValue = toLowBN(fort2ProducingResourceConfig!.perTick).multipliedBy(calculateProductionTicksAmount);
    const timeToResourcesGone = toBeProducedValue.dividedBy(fortRegenerationPerSecond);

    //first half fort destruction with no health
    const buildingLastUpdateStateTimeBeforeFirstHalfFortRepairmentWithNoHealth = toBN((await fort2.production()).lastUpdateStateTime);
    const firstHalfDestructionTime = (timeToResourcesGone.integerValue(BigNumber.ROUND_FLOOR).dividedBy(2)).integerValue(BigNumber.ROUND_CEIL);
    await EvmUtils.increaseTime(firstHalfDestructionTime.toNumber());
    await fort2.updateState().then((tx) => tx.wait());
    const buildingLastUpdateStateTimeAfterFirstHalfFortRepairmentWithNoHealth = toBN((await fort2.production()).lastUpdateStateTime);
    const timePassedDuringFistHalfFortRepairmentWithNoHealth = buildingLastUpdateStateTimeAfterFirstHalfFortRepairmentWithNoHealth.minus(buildingLastUpdateStateTimeBeforeFirstHalfFortRepairmentWithNoHealth);

    const ticksPerSecond = (new BigNumber(fortRegenerationPerSecond).dividedBy(toLowBN(fort2ProducingResourceConfig!.perTick))).integerValue(BigNumber.ROUND_CEIL);
    const totalTicksThatHaveToBeProducedDuringFistHalfFortRepairmentWithNoHealth = ticksPerSecond.multipliedBy(timePassedDuringFistHalfFortRepairmentWithNoHealth);

    const buildingResourceAfterFirstHalfFortDestructionWithNoHealth = await ResourceHelper.getResourcesStateBalanceOf(
      fort2.address,
      fort2SpendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    const fortHealthAfterFirstHalfDestructionWithNoHealth = toLowBN(await fort2.health());
    expect(fortHealthAfterFirstHalfDestructionWithNoHealth).eql(new BigNumber(0), 'Fort 2 health quantity is not correct');

    for (let i = 0; i < fort2SpendingResourceConfigs.length; i++) {
      const resourceType = fort2SpendingResourceConfigs[i].resourceName;
      expect(buildingResourceAfterFirstHalfFortDestructionWithNoHealth[resourceType]).eql(
        buildingResourceAfterDestruction[resourceType].minus(totalTicksThatHaveToBeProducedDuringFistHalfFortRepairmentWithNoHealth.multipliedBy(toLowBN(fort2SpendingResourceConfigs[i].perTick))));
    }

    //second half fort destruction with no health
    const secondHalfDestructionTime = timeToResourcesGone.integerValue(BigNumber.ROUND_FLOOR).minus(firstHalfDestructionTime);
    await EvmUtils.increaseTime(secondHalfDestructionTime.toNumber());
    await fort2.updateState().then((tx) => tx.wait());

    const timePassedDuringSecondHalfFortRepairmentWithNoHealth = timeToResourcesGone.integerValue(BigNumber.ROUND_FLOOR).minus(timePassedDuringFistHalfFortRepairmentWithNoHealth);
    const totalTicksThatHaveToBeProducedDuringSecondHalfFortRepairmentWithNoHealth = ticksPerSecond.multipliedBy(timePassedDuringSecondHalfFortRepairmentWithNoHealth);

    const buildingResourceAfterSecondHalfFortRepairmentWithNoHealth = await ResourceHelper.getResourcesStateBalanceOf(
      fort2.address,
      fort2SpendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    const fortHealthAfterSecondHalfDestructionWithNoHealth = toLowBN(await fort2.health());
    expect(fortHealthAfterSecondHalfDestructionWithNoHealth).eql(new BigNumber(0), 'Fort 2 health quantity is not correct');

    for (let i = 0; i < fort2SpendingResourceConfigs.length; i++) {
      const resourceType = fort2SpendingResourceConfigs[i].resourceName;
      expect(buildingResourceAfterSecondHalfFortRepairmentWithNoHealth[resourceType]).eql(
        buildingResourceAfterFirstHalfFortDestructionWithNoHealth[resourceType].minus(totalTicksThatHaveToBeProducedDuringSecondHalfFortRepairmentWithNoHealth.multipliedBy(toLowBN(fort2SpendingResourceConfigs[i].perTick))));
    }

    //tokens spending
    await army.claimResources(farm2.address, transferableFromLowBN(new BigNumber(10))).then((tx) => tx.wait());
    const tokensAfterClaimResources = toLowBN(await siegeInstance.getUserPoints(army.address));

    //fort destruction after resources gone
    const buildingLastUpdateStateTimeBeforeDestructionWithNoResource = toBN((await fort2.production()).lastUpdateStateTime);
    await EvmUtils.increaseTime(10);
    await fort2.updateState().then((tx) => tx.wait());
    const buildingLastUpdateStateTimeAfterDestructionWithNoResource = toBN((await fort2.production()).lastUpdateStateTime);
    const timePassedDuringDestructionWithNoResource = buildingLastUpdateStateTimeAfterDestructionWithNoResource.minus(buildingLastUpdateStateTimeBeforeDestructionWithNoResource);

    const actualTokens = toLowBN(await siegeInstance.getUserPoints(army.address));
    const tokenRegenPerSecondWithNoResource = (actualTokens.minus(tokensAfterClaimResources)).dividedBy(timePassedDuringDestructionWithNoResource);
    expect(tokenRegenPerSecondWithNoResource).to.be.above(tokensRegenPerSecondWithResource);

    const actualBuildingResource = await ResourceHelper.getResourcesQuantity(
      fort2.address,
      fort2SpendingResourceConfigs.map((value) => value.resourceName as ResourceType)
    );

    const actualFortHealth = toLowBN(await fort2.health());
    expect(actualFortHealth).eql(new BigNumber(0), 'Fort 2 health quantity is not correct');

    for (let i = 0; i < fort2SpendingResourceConfigs.length; i++) {
      const resourceType = fort2SpendingResourceConfigs[i].resourceName;
      expect(buildingResourceAfterSecondHalfFortRepairmentWithNoHealth[resourceType]).eql(actualBuildingResource[resourceType]);
    }
  }

  public static async fortRepairmentWithSummonedCultistsTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const unitQuantity = 4;
    const siegeUnitQuantity = unitQuantity / 2;
    const unitTypes = [UnitType.WARRIOR];
    const investWorkerQuantity = 3;
    const investResourceQuantity = 100;
    const fortRepairmentTime = 50000;
    const maxWeaponQuantity = 1000;
    const toxicityAmount = 10000;

    const registryInstance = await WorldHelper.getRegistryInstance();

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const fort = await SettlementHelper.getFort(user2SettlementInstance);

    const productionConfig = await fort.getConfig();
    const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const army = await SettlementHelper.getArmy(user1SettlementInstance);

    await UnitHelper.hireUnits(army, unitTypes, unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army, await user2SettlementInstance.position(), 0, true);

    //fort destruction
    await army.setUnitsInSiege(
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity))),
      [],
      []
    ).then(tx => tx.wait());

    const fortDestructionTime = await FortHelper.getSettlementFortDestructionTime(user2SettlementInstance);
    await EvmUtils.increaseTime(fortDestructionTime.toNumber());

    await fort.updateState().then((tx) => tx.wait());

    await army.setUnitsInSiege(
      [],
      [],
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity)))
    ).then(tx => tx.wait());

    const fortHealthBefore = toLowBN(await fort.health());

    await user2SettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      fort.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    const buildingLastUpdateStateTimeBefore = toBN((await fort.production()).lastUpdateStateTime);

    await EvmUtils.increaseTime(fortRepairmentTime);

    await fort.removeResourcesAndWorkers(
      user2SettlementInstance.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      testUser2,
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    await fort.updateState().then((tx) => tx.wait());

    const buildingLastUpdateStateTimeAfter = toBN((await fort.production()).lastUpdateStateTime);

    const timePassed = buildingLastUpdateStateTimeAfter.minus(buildingLastUpdateStateTimeBefore);

    const fortHealthAfter = toLowBN(await fort.health());

    const regenerationPerSecond = (fortHealthAfter.minus(fortHealthBefore)).dividedBy(timePassed);

    //toxicity increase
    await ProductionHelper.increaseToxicityBySettlement(user1SettlementInstance, toxicityAmount);

    //cultists summon
    const summonDelay = toBN(await registryInstance.getCultistsSummonDelay());
    await EvmUtils.increaseTime(summonDelay.toNumber());

    await WorldHelper.summonCultistsInCurrentSettlementZone(user2SettlementInstance);

    //fort destruction
    await army.setUnitsInSiege(
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity))),
      [],
      []
    ).then(tx => tx.wait());

    const fortDestructionTimeWithSummonedCultists = await FortHelper.getSettlementFortDestructionTime(user2SettlementInstance);
    await EvmUtils.increaseTime(fortDestructionTimeWithSummonedCultists.toNumber());

    await fort.updateState().then((tx) => tx.wait());

    await army.setUnitsInSiege(
      [],
      [],
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(siegeUnitQuantity)))
    ).then(tx => tx.wait());

    const fortHealthWithSummonedCultists = toLowBN(await fort.health());

    await user2SettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      fort.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    const buildingLastUpdateStateTimeWithSummonedCultistsBefore = toBN((await fort.production()).lastUpdateStateTime);

    await EvmUtils.increaseTime(fortRepairmentTime);

    await fort.removeResourcesAndWorkers(
      user2SettlementInstance.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      testUser2,
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    await fort.updateState().then((tx) => tx.wait());

    const buildingLastUpdateStateTimeWithSummonedCultistsAfter = toBN((await fort.production()).lastUpdateStateTime);

    const timePassedWithSummonedCultists = buildingLastUpdateStateTimeWithSummonedCultistsAfter.minus(buildingLastUpdateStateTimeWithSummonedCultistsBefore);

    const actualFortHealth = toLowBN(await fort.health());

    const regenerationPerSecondWithSummonedCultists = (actualFortHealth.minus(fortHealthWithSummonedCultists)).dividedBy(timePassedWithSummonedCultists);
    expect(regenerationPerSecondWithSummonedCultists).isInCloseRangeWith(regenerationPerSecond);
  }
}
