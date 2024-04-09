import { ethers, getNamedAccounts } from "hardhat";
import {
  Banners__factory,
  Epoch__factory,
  Geography__factory,
  SettlementsMarket__factory,
  Zone__factory
} from "../../typechain-types";
import { UserHelper } from "../helpers/UserHelper";
import { EvmUtils } from "../helpers/EvmUtils";
import { MovementHelper } from "../helpers/MovementHelper";
import { toBN, toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import { WorldHelper } from "../helpers/WorldHelper";
import BigNumber from "bignumber.js";
import { BuildingType } from "../enums/buildingType";
import { expect } from "chai";
import { ProductionHelper } from "../helpers/ProductionHelper";
import { SettlementHelper } from "../helpers/SettlementHelper";
import { CaptureHelper } from "../helpers/CaptureHelper";
import { getPosition } from "../utils/position";
import { DEFAULT_BANNER_PARTS } from "../constants/banners";
import { FortHelper } from "../helpers/FortHelper";
import { tileBonusOccurrences, zones } from "../../scripts/data/zones";
import { zip } from "lodash";
import { BuildingHelper } from "../helpers/BuildingHelper";

export class TileCaptureCoreTest {
  public static async tileCaptureTest(buildingType: BuildingType, zoneNumber: number) {
    const {testUser1} = await getNamedAccounts();

    const investResourceQuantity = 5000;
    const productionTime = 1000;
    const prosperityStake = 5;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);

    const captureTileDurationPerTile = toBN(await registryInstance.getCaptureTileDurationPerTile());
    const necessaryProsperityPercentForClaimingTileCapture = toLowBN(await registryInstance.getNecessaryProsperityPercentForClaimingTileCapture());
    const geographyAddress = await worldInstance.geography();
    const geographyInstance = Geography__factory.connect(geographyAddress, userSettlementInstance.signer);

    const prosperityInstance = await WorldHelper.getProsperityInstance();

    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

    const tilePosition = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(buildingType, zoneNumber);

    const actualWorkersCap = toLowBN(await buildingInstance.getMaxWorkers());

    const productionConfig = await buildingInstance.getConfig();
    const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const tileBonus = await geographyInstance.getTileBonusByPosition(tilePosition as number);
    const [advancedProductionTileBonusType, advancedProductionTileBonusPercent] = await registryInstance.getAdvancedProductionTileBonusByVariation(tileBonus.tileBonusVariation);
    expect(buildingType).eql(advancedProductionTileBonusType);

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance, BuildingType.SMITHY, prosperityStake);

    await userSettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      buildingInstance.address,
      transferableFromLowBN(new BigNumber(actualWorkersCap)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    const productionPerSecond = await ProductionHelper.getProductionPerSecond(userSettlementInstance, buildingType, productionTime);

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));

    const workersInvestedBefore = toLowBN(await buildingInstance.getWorkers());

    const settlementPosition = await userSettlementInstance.position();
    const positionsPath = MovementHelper.getMovementPath(settlementPosition, tilePosition as number);
    const captureDuration = captureTileDurationPerTile.multipliedBy(positionsPath.length);

    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    await userSettlementInstance.beginTileCapture(tilePosition as number, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait());

    await EvmUtils.increaseTime(captureDuration.toNumber());

    const prosperityBalanceBeforeClaim = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalanceBeforeClaim).gte(necessaryProsperityPercentForClaimingTileCapture.multipliedBy(prosperityStake));

    await userSettlementInstance.claimCapturedTile(tilePosition as number).then(tx => tx.wait());

    const workersInvestedAfter = toLowBN(await buildingInstance.getWorkers());
    expect(workersInvestedAfter).eql(workersInvestedBefore.minus((workersInvestedBefore.multipliedBy(toLowBN(advancedProductionTileBonusPercent))).integerValue(BigNumber.ROUND_DOWN)));

    await expect(
      userSettlementInstance.assignResourcesAndWorkersToBuilding(
        ethers.constants.AddressZero.toString(),
        buildingInstance.address,
        transferableFromLowBN(new BigNumber(actualWorkersCap).minus(workersInvestedAfter)),
        [],
        []
      ).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'settlement balance exceed limit'");

    const newProductionPerSecond = await ProductionHelper.getProductionPerSecond(userSettlementInstance, buildingType, productionTime);
    expect(newProductionPerSecond).eql(productionPerSecond);
  }

  public static async fortTileCaptureTest(zoneNumber: number) {
    const {testUser1} = await getNamedAccounts();

    const investResourceQuantity = 5000;
    const regenerationTime = 1000;
    const prosperityStake = 5;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);

    const captureTileDurationPerTile = toBN(await registryInstance.getCaptureTileDurationPerTile());
    const necessaryProsperityPercentForClaimingTileCapture = toLowBN(await registryInstance.getNecessaryProsperityPercentForClaimingTileCapture());
    const geographyAddress = await worldInstance.geography();
    const geographyInstance = Geography__factory.connect(geographyAddress, userSettlementInstance.signer);

    const prosperityInstance = await WorldHelper.getProsperityInstance();

    const fort = await SettlementHelper.getFort(userSettlementInstance);

    const tilePosition = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(BuildingType.FORT, zoneNumber);

    const actualWorkersCap = toLowBN(await fort.getMaxWorkers());

    const productionConfig = await fort.getConfig();
    const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const tileBonus = await geographyInstance.getTileBonusByPosition(tilePosition as number);
    const [advancedProductionTileBonusType, advancedProductionTileBonusPercent] = await registryInstance.getAdvancedProductionTileBonusByVariation(tileBonus.tileBonusVariation);
    expect(BuildingType.FORT).eql(advancedProductionTileBonusType);

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance, BuildingType.SMITHY, prosperityStake);

    await userSettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      fort.address,
      transferableFromLowBN(new BigNumber(actualWorkersCap)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    const regenerationPerSecond = await FortHelper.getFortRegenerationPerSecond(fort, regenerationTime);

    const workersInvestedBefore = toLowBN(await fort.getWorkers());

    await fort.removeResourcesAndWorkers(
      userSettlementInstance.address,
      transferableFromLowBN(new BigNumber(actualWorkersCap)),
      testUser1,
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));

    const settlementPosition = await userSettlementInstance.position();
    const positionsPath = MovementHelper.getMovementPath(settlementPosition, tilePosition as number);
    const captureDuration = captureTileDurationPerTile.multipliedBy(positionsPath.length);

    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    await userSettlementInstance.beginTileCapture(tilePosition as number, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait());

    await EvmUtils.increaseTime(captureDuration.toNumber());

    const prosperityBalanceBeforeClaim = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalanceBeforeClaim).gte(necessaryProsperityPercentForClaimingTileCapture.multipliedBy(prosperityStake));

    await userSettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      fort.address,
      transferableFromLowBN(new BigNumber(actualWorkersCap)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    await userSettlementInstance.claimCapturedTile(tilePosition as number).then(tx => tx.wait());

    const workersInvestedAfter = toLowBN(await fort.getWorkers());
    expect(workersInvestedAfter).eql(workersInvestedBefore.minus((workersInvestedBefore.multipliedBy(toLowBN(advancedProductionTileBonusPercent))).integerValue(BigNumber.ROUND_DOWN)));

    await expect(
      userSettlementInstance.assignResourcesAndWorkersToBuilding(
        ethers.constants.AddressZero.toString(),
        fort.address,
        transferableFromLowBN(new BigNumber(actualWorkersCap).minus(workersInvestedAfter)),
        [],
        []
      ).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'settlement balance exceed limit'");

    const newRegenerationPerSecond = await FortHelper.getFortRegenerationPerSecond(fort, regenerationTime);
    expect(newRegenerationPerSecond).eql(regenerationPerSecond);
  }

  public static async impossibleTileCaptureWithoutProsperity() {
    const {testUser1} = await getNamedAccounts();

    const prosperityStake = 5;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const zoneAddress = await userSettlementInstance.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);
    const zoneNumber = (await zoneInstance.zoneId()) - 1;

    const tilePosition = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(BuildingType.LUMBERMILL, zoneNumber);

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalance).lt(new BigNumber(prosperityStake));

    await expect(
      userSettlementInstance.beginTileCapture(tilePosition as number, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'not enough prosperity'");
  }

  public static async impossibleTileCaptureByZeroStake() {
    const {testUser1} = await getNamedAccounts();

    const prosperityStake = 0;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const zoneAddress = await userSettlementInstance.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);
    const zoneNumber = (await zoneInstance.zoneId()) - 1;

    const tilePosition = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(BuildingType.LUMBERMILL, zoneNumber);

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    await expect(
      userSettlementInstance.beginTileCapture(tilePosition as number, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'can't bid 0 prosperity'");
  }

  public static async impossibleTileClaimWithoutProsperity() {
    const {testUser1} = await getNamedAccounts();

    const prosperityStake = 60;
    const hireWorkerQuantity = 60;

    const registryInstance = await WorldHelper.getRegistryInstance();

    const captureTileDurationPerTile = toBN(await registryInstance.getCaptureTileDurationPerTile());
    const necessaryProsperityPercentForClaimingTileCapture = toLowBN(await registryInstance.getNecessaryProsperityPercentForClaimingTileCapture());

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const zoneAddress = await userSettlementInstance.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);
    const zoneNumber = (await zoneInstance.zoneId()) - 1;

    const tilePosition = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(BuildingType.LUMBERMILL, zoneNumber);

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance, BuildingType.SMITHY, prosperityStake);

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    const settlementPosition = await userSettlementInstance.position();
    const positionsPath = MovementHelper.getMovementPath(settlementPosition, tilePosition as number);
    const captureDuration = captureTileDurationPerTile.multipliedBy(positionsPath.length);

    await userSettlementInstance.beginTileCapture(tilePosition as number, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait());

    await EvmUtils.increaseTime(captureDuration.toNumber());

    const prosperityBalanceBeforeHire = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalanceBeforeHire).gte(necessaryProsperityPercentForClaimingTileCapture.multipliedBy(prosperityStake));

    //workers hire
    await userSettlementInstance.swapProsperityForExactWorkers(
      transferableFromLowBN(new BigNumber(hireWorkerQuantity)),
      transferableFromLowBN(new BigNumber(prosperityBalanceBeforeHire))
    ).then(tx => tx.wait());

    const prosperityBalanceBeforeClaim = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalanceBeforeClaim).lt(necessaryProsperityPercentForClaimingTileCapture.multipliedBy(prosperityStake));

    await expect(
      userSettlementInstance.claimCapturedTile(tilePosition as number).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'not enough prosperity for claiming'");
  }

  public static async impossibleTileClaimDuringCapture() {
    const {testUser1} = await getNamedAccounts();

    const prosperityStake = 5;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const zoneAddress = await userSettlementInstance.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);
    const zoneNumber = (await zoneInstance.zoneId()) - 1;

    const tilePosition = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(BuildingType.LUMBERMILL, zoneNumber);

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance, BuildingType.SMITHY, prosperityStake);

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    await userSettlementInstance.beginTileCapture(tilePosition as number, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait());

    await expect(
      userSettlementInstance.claimCapturedTile(tilePosition as number).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'cannot claim yet'");
  }

  public static async impossibleTilesCaptureAtTheSameTimeTest() {
    const {testUser1} = await getNamedAccounts();

    const prosperityStake = 5;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const zoneAddress = await userSettlementInstance.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);
    const zoneNumber = (await zoneInstance.zoneId()) - 1;

    const tilePosition1 = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(BuildingType.LUMBERMILL, zoneNumber);
    const tilePosition2 = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(BuildingType.SMITHY, zoneNumber);

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance, BuildingType.SMITHY, prosperityStake);

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    await userSettlementInstance.beginTileCapture(tilePosition1 as number, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait());

    await expect(
      userSettlementInstance.beginTileCapture(tilePosition2 as number, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'settlement already capturing tile'");
  }

  public static async impossibleTileCaptureDueMaxLimitTest() {
    const {testUser1} = await getNamedAccounts();

    const registryInstance = await WorldHelper.getRegistryInstance();

    const prosperityStake = 5;

    const maxCapturedTilesForSettlement = toBN(await registryInstance.getMaxCapturedTilesForSettlement());

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const prosperityInstance = await WorldHelper.getProsperityInstance();

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance, BuildingType.SMITHY, prosperityStake);

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    const allPositionsOfAdvancedProductionTileBonus = this.getAllPositionsOfAdvancedProductionTileBonus();
    for (let i = 0; i < maxCapturedTilesForSettlement.toNumber(); i++) {
      const tilePosition = allPositionsOfAdvancedProductionTileBonus[i];
      await CaptureHelper.captureTile(userSettlementInstance, tilePosition as number, prosperityStake);
    }

    await expect(
      CaptureHelper.captureTile(userSettlementInstance,
        allPositionsOfAdvancedProductionTileBonus[maxCapturedTilesForSettlement.toNumber()] as number, prosperityStake)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'maximum captures reached'");
  }

  public static async tileMaxBuffLimitTest() {
    const {testUser1} = await getNamedAccounts();

    const buildingType = BuildingType.SMITHY;
    const prosperityStake = 5;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const maxAdvancedProductionTileBuff = toLowBN(await registryInstance.getMaxAdvancedProductionTileBuff());
    const geographyAddress = await worldInstance.geography();
    const geographyInstance = Geography__factory.connect(geographyAddress, userSettlementInstance.signer);

    const prosperityInstance = await WorldHelper.getProsperityInstance();

    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

    const tilePosition1 = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(buildingType, 1);
    const tilePosition2 = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(buildingType, 2);

    const actualWorkersCap = toLowBN(await buildingInstance.getMaxWorkers());

    const tileBonus1 = await geographyInstance.getTileBonusByPosition(tilePosition1 as number);
    const [advancedProductionTileBonusType1, advancedProductionTileBonusPercent1] = await registryInstance.getAdvancedProductionTileBonusByVariation(tileBonus1.tileBonusVariation);
    expect(buildingType).eql(advancedProductionTileBonusType1);

    const tileBonus2 = await geographyInstance.getTileBonusByPosition(tilePosition1 as number);
    const [advancedProductionTileBonusType2, advancedProductionTileBonusPercent2] = await registryInstance.getAdvancedProductionTileBonusByVariation(tileBonus2.tileBonusVariation);
    expect(buildingType).eql(advancedProductionTileBonusType2);

    expect(toLowBN(advancedProductionTileBonusPercent1).plus(toLowBN(advancedProductionTileBonusPercent2))).gt(maxAdvancedProductionTileBuff);

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance, BuildingType.SMITHY, prosperityStake);

    await userSettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      buildingInstance.address,
      transferableFromLowBN(new BigNumber(actualWorkersCap)),
      [],
      []
    ).then(tx => tx.wait());

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    const workersInvestedBefore = toLowBN(await buildingInstance.getWorkers());

    await CaptureHelper.captureTile(userSettlementInstance, tilePosition1 as number, prosperityStake);
    await CaptureHelper.captureTile(userSettlementInstance, tilePosition2 as number, prosperityStake);

    const workersInvestedAfter = toLowBN(await buildingInstance.getWorkers());
    expect(workersInvestedAfter).eql(workersInvestedBefore.minus((workersInvestedBefore.multipliedBy(maxAdvancedProductionTileBuff)).integerValue(BigNumber.ROUND_DOWN)));
  }

  public static async tileGiveUpTest() {
    const {testUser1} = await getNamedAccounts();

    const buildingType = BuildingType.SMITHY;
    const prosperityStake = 5;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const zoneAddress = await userSettlementInstance.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);
    const zoneNumber = (await zoneInstance.zoneId()) - 1;

    const geographyAddress = await worldInstance.geography();
    const geographyInstance = Geography__factory.connect(geographyAddress, userSettlementInstance.signer);

    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

    const tilePosition = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(buildingType, zoneNumber);

    const tileBonus = await geographyInstance.getTileBonusByPosition(tilePosition as number);
    const [advancedProductionTileBonusType, advancedProductionTileBonusPercent] = await registryInstance.getAdvancedProductionTileBonusByVariation(tileBonus.tileBonusVariation);
    expect(buildingType).eql(advancedProductionTileBonusType);

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance, buildingType, prosperityStake);

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    //tile capture
    await CaptureHelper.captureTile(userSettlementInstance, tilePosition as number, prosperityStake);

    const isTileCapturedBefore = await CaptureHelper.isTileCapturedBySettlement(tilePosition as number, userSettlementInstance);
    expect(isTileCapturedBefore).to.be.true;

    const workersInvestedBefore = toLowBN(await buildingInstance.getWorkers());

    await userSettlementInstance.giveUpCapturedTile(tilePosition as number).then(tx => tx.wait());

    const isTileCapturedAfter = await CaptureHelper.isTileCapturedBySettlement(tilePosition as number, userSettlementInstance);
    expect(isTileCapturedAfter).to.be.false;

    const workersInvestedAfter = toLowBN(await buildingInstance.getWorkers());
    expect(workersInvestedAfter).eql(workersInvestedBefore.plus((workersInvestedBefore.multipliedBy(toLowBN(advancedProductionTileBonusPercent))).integerValue(BigNumber.ROUND_DOWN)));
  }

  public static async tileCaptureByAnotherUserTest() {
    const {testUser1, testUser2} = await getNamedAccounts();

    const buildingType = BuildingType.SMITHY;
    const prosperityStake = 5;

    const userSettlementInstance1 = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const userSettlementInstance2 = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const zoneAddress = await userSettlementInstance1.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance1.signer);
    const zoneNumber = (await zoneInstance.zoneId()) - 1;

    const tilePosition = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(buildingType, zoneNumber);

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance1, buildingType, prosperityStake);
    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance2, buildingType, prosperityStake);

    const prosperityBalance1 = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance1.address));
    const prosperityBalance2 = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance2.address));

    expect(prosperityBalance1).gte(new BigNumber(prosperityStake));
    expect(prosperityBalance2).gte(new BigNumber(prosperityStake));

    //tile capture by testUser1
    await CaptureHelper.captureTile(userSettlementInstance1, tilePosition as number, prosperityStake);

    const isTileCapturedBefore1 = await CaptureHelper.isTileCapturedBySettlement(tilePosition as number, userSettlementInstance1);
    const isTileCapturedBefore2 = await CaptureHelper.isTileCapturedBySettlement(tilePosition as number, userSettlementInstance2);

    expect(isTileCapturedBefore1).to.be.true;
    expect(isTileCapturedBefore2).to.be.false;

    //tile capture by testUser2
    await CaptureHelper.captureTile(userSettlementInstance2, tilePosition as number, prosperityStake);

    const isTileCapturedAfter1 = await CaptureHelper.isTileCapturedBySettlement(tilePosition as number, userSettlementInstance1);
    const isTileCapturedAfter2 = await CaptureHelper.isTileCapturedBySettlement(tilePosition as number, userSettlementInstance2);

    expect(isTileCapturedAfter1).to.be.false;
    expect(isTileCapturedAfter2).to.be.true;
  }

  public static async cancelTileCaptureTest() {
    const {testUser1} = await getNamedAccounts();

    const buildingType = BuildingType.SMITHY;
    const prosperityStake = 17;
    const hireWorkerQuantity = 5;

    const registryInstance = await WorldHelper.getRegistryInstance();

    const tileCaptureCancellationFee = toLowBN(await registryInstance.getTileCaptureCancellationFee());

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const zoneAddress = await userSettlementInstance.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);
    const zoneNumber = (await zoneInstance.zoneId()) - 1;

    const tilePosition = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(buildingType, zoneNumber);

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance, buildingType, prosperityStake);

    const prosperityBalance = toLowBN(await prosperityInstance.realBalanceOf(userSettlementInstance.address));
    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    await userSettlementInstance.beginTileCapture(tilePosition as number, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait());

    const prosperityBalanceAfterCaptureStarted = toLowBN(await prosperityInstance.realBalanceOf(userSettlementInstance.address));

    //workers hire
    await userSettlementInstance.swapProsperityForExactWorkers(
      transferableFromLowBN(new BigNumber(hireWorkerQuantity)),
      transferableFromLowBN(new BigNumber(prosperityBalanceAfterCaptureStarted))
    ).then(tx => tx.wait());

    const prosperityBalanceBeforeCancel = toLowBN(await prosperityInstance.realBalanceOf(userSettlementInstance.address));
    expect(prosperityBalanceBeforeCancel).lt(tileCaptureCancellationFee.multipliedBy(prosperityStake));

    await userSettlementInstance.cancelTileCapture(tilePosition as number).then(tx => tx.wait());

    const prosperityBalanceAfterCancel = toLowBN(await prosperityInstance.realBalanceOf(userSettlementInstance.address));

    const isTileCaptured = await CaptureHelper.isTileCapturedBySettlement(tilePosition as number, userSettlementInstance);
    expect(isTileCaptured).to.be.false;

    expect(prosperityBalanceAfterCancel).isInCloseRangeWith(prosperityBalanceBeforeCancel.minus(tileCaptureCancellationFee.multipliedBy(prosperityStake)));
  }

  public static async settlementPurchaseOnTileWithBonusTest() {
    const {testUser1} = await getNamedAccounts();

    const positionX = 32742;
    const positionY = 32746;
    const bannerName = 'test';
    const buildingType = BuildingType.SMITHY;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);

    const geographyAddress = await worldInstance.geography();
    const geographyInstance = Geography__factory.connect(geographyAddress, userSettlementInstance.signer);

    const currentEpochNumber = await worldInstance.currentEpochNumber();
    const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);
    const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, userSettlementInstance.signer);

    const zoneAddress = await currentEpochInstance.zones(3);
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, userSettlementInstance.signer);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, userSettlementInstance.signer);

    const blessTokenAddress = await worldInstance.blessToken();

    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);
    const actualWorkersCap = toLowBN(await buildingInstance.getMaxWorkers());

    const tileBonus = await geographyInstance.getTileBonusByPosition(getPosition(positionX, positionY));
    const [advancedProductionTileBonusType, advancedProductionTileBonusPercent] = await registryInstance.getAdvancedProductionTileBonusByVariation(tileBonus.tileBonusVariation);
    expect(buildingType).eql(advancedProductionTileBonusType);

    await userSettlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      buildingInstance.address,
      transferableFromLowBN(new BigNumber(actualWorkersCap)),
      [],
      []
    ).then(tx => tx.wait());

    const workersInvestedBefore = toLowBN(await buildingInstance.getWorkers());

    const settlementCost = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    //banner mint
    await bannersInstance.mint(bannerName, DEFAULT_BANNER_PARTS, "0x").then((tx) => tx.wait());
    await zoneInstance.updateState().then((tx) => tx.wait());

    const userBanners = await bannersInstance.getBannerDataByUserBatch(testUser1);
    const lastBannerIndex = userBanners.tokenIds.length - 1;

    //settlement purchase
    await settlementsMarketInstance
      .buySettlement(
        getPosition(positionX, positionY),
        userBanners.tokenIds[lastBannerIndex].toString(),
        ethers.constants.MaxUint256.toString(),
        blessTokenAddress === ethers.constants.AddressZero
          ? {value: transferableFromLowBN(settlementCost)}
          : {}
      )
      .then((tx) => tx.wait());

    const workersInvestedAfter = toLowBN(await buildingInstance.getWorkers());
    expect(workersInvestedAfter).eql(workersInvestedBefore);
  }

  public static async ownTileCaptureTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const buildingType = BuildingType.SMITHY;
    const prosperityStake = 5;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance1 = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const userSettlementInstance2 = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const captureTileDurationPerTile = toBN(await registryInstance.getCaptureTileDurationPerTile());
    const nextCaptureProsperityThreshold = toLowBN(await registryInstance.getNextCaptureProsperityThreshold());
    const geographyAddress = await worldInstance.geography();
    const geographyInstance = Geography__factory.connect(geographyAddress, userSettlementInstance1.signer);

    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const zoneAddress = await userSettlementInstance1.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance1.signer);
    const zoneNumber = (await zoneInstance.zoneId()) - 1;

    const tilePosition = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(buildingType, zoneNumber);

    const tileBonus = await geographyInstance.getTileBonusByPosition(tilePosition as number);
    const [advancedProductionTileBonusType, advancedProductionTileBonusPercent] = await registryInstance.getAdvancedProductionTileBonusByVariation(tileBonus.tileBonusVariation);
    expect(buildingType).eql(advancedProductionTileBonusType);

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance1, buildingType, prosperityStake);
    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance2, buildingType, prosperityStake);

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance1.address));
    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    //tile capture
    await CaptureHelper.captureTile(userSettlementInstance1, tilePosition as number, prosperityStake);

    const isTileCapturedBefore = await CaptureHelper.isTileCapturedBySettlement(tilePosition as number, userSettlementInstance1);
    expect(isTileCapturedBefore).to.be.true;

    const settlementPosition = await userSettlementInstance1.position();
    const positionsPath = MovementHelper.getMovementPath(settlementPosition, tilePosition as number);
    const captureDuration = captureTileDurationPerTile.multipliedBy(positionsPath.length);

    await userSettlementInstance2.beginTileCapture(tilePosition as number, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait());
    await userSettlementInstance1.beginTileCapture(tilePosition as number, transferableFromLowBN(nextCaptureProsperityThreshold.multipliedBy(prosperityStake))).then(tx => tx.wait());
    await EvmUtils.increaseTime(captureDuration.toNumber());
    await userSettlementInstance1.claimCapturedTile(tilePosition as number).then(tx => tx.wait());

    const isTileCapturedAfter = await CaptureHelper.isTileCapturedBySettlement(tilePosition as number, userSettlementInstance1);
    expect(isTileCapturedAfter).to.be.true;
  }

  public static async impossibleOwnTileCaptureIfProsperityThresholdNotReachedTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const prosperityStake = 5;
    const newProsperityStake = 6;
    const buildingType = BuildingType.LUMBERMILL;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance1 = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const userSettlementInstance2 = await UserHelper.getUserSettlementByNumber(testUser2, 1);

    const nextCaptureProsperityThreshold = toLowBN(await registryInstance.getNextCaptureProsperityThreshold());
    const geographyAddress = await worldInstance.geography();
    const geographyInstance = Geography__factory.connect(geographyAddress, userSettlementInstance1.signer);

    const prosperityInstance = await WorldHelper.getProsperityInstance();
    const zoneAddress = await userSettlementInstance1.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance1.signer);
    const zoneNumber = (await zoneInstance.zoneId()) - 1;

    const tilePosition = this.getPositionOfAdvancedProductionTileBonusByBuildingInZone(buildingType, zoneNumber);

    const tileBonus = await geographyInstance.getTileBonusByPosition(tilePosition as number);
    const [advancedProductionTileBonusType, advancedProductionTileBonusPercent] = await registryInstance.getAdvancedProductionTileBonusByVariation(tileBonus.tileBonusVariation);
    expect(buildingType).eql(advancedProductionTileBonusType);

    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance1, BuildingType.SMITHY, prosperityStake);
    await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance2, BuildingType.SMITHY, prosperityStake);

    const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance1.address));
    expect(prosperityBalance).gte(new BigNumber(prosperityStake));

    //tile capture
    await CaptureHelper.captureTile(userSettlementInstance1, tilePosition as number, prosperityStake);

    const isTileCapturedBefore = await CaptureHelper.isTileCapturedBySettlement(tilePosition as number, userSettlementInstance1);
    expect(isTileCapturedBefore).to.be.true;

    await userSettlementInstance2.beginTileCapture(tilePosition as number, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait());

    expect(new BigNumber(newProsperityStake)).lt(nextCaptureProsperityThreshold.multipliedBy(prosperityStake));

    await expect(
      userSettlementInstance1.beginTileCapture(tilePosition as number, transferableFromLowBN(new BigNumber(newProsperityStake))).then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'prosperity threshold not reached'");
  }

  public static getAllPositionsOfAdvancedProductionTileBonus() {
    let allPositionsWithBonus: (number | undefined)[] = []
    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      const positionsWithBonus = zip(zone.positions, zone.tileBonuses)
        .filter(([position, tileBonus]) => (tileBonus!.tileBonusType as number) !== 0)
        .map(([position, tileBonus]) => position);

      allPositionsWithBonus = allPositionsWithBonus.concat(positionsWithBonus);
    }

    return allPositionsWithBonus;
  }

  public static getPositionOfAdvancedProductionTileBonusByBuildingInZone(buildingType: BuildingType, zoneNumber: number) {
    const zone = zones[zoneNumber];
    const positionWithBonus = zip(zone.positions, zone.tileBonuses)
      .filter(([position, tileBonus]) => (tileBonus!.tileBonusType as number) !== 0)
      .find(([position, tileBonus]) => {
        return tileBonusOccurrences[tileBonus!.tileBonusVariation as number].type === buildingType;
      });

    if (positionWithBonus !== undefined) {
      return positionWithBonus[0];
    }

    return null;
  }
}
