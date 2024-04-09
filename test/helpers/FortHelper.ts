import { toBN, toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import BigNumber from "bignumber.js";
import { EvmUtils } from "./EvmUtils";
import { SettlementHelper } from "./SettlementHelper";
import { expect } from "chai";
import { ProductionHelper } from "./ProductionHelper";
import { BuildingType } from "../enums/buildingType";
import {
  Fort,
  Settlement,
  Siege__factory
} from "../../typechain-types";
import { WorldHelper } from "./WorldHelper";
import { ethers } from "hardhat";

export class FortHelper {
  public static async repairFort(
    settlementInstance: Settlement,
    investWorkerQuantity: number,
    healthAmountToRestore: BigNumber
  ) {
    const fort = await SettlementHelper.getFort(settlementInstance);
    const currentFortHealth = toLowBN(await fort.health());

    const productionConfig = await fort.getConfig();
    const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const fortRegenerationPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy(investWorkerQuantity);
    const basicProductionMultiplier = await ProductionHelper.getBasicProductionMultiplier(settlementInstance, BuildingType.FORT);
    const fortPassiveRegenerationPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy(basicProductionMultiplier);
    const totalRegenerationPerSecond = fortRegenerationPerSecond.plus(fortPassiveRegenerationPerSecond);

    const fortRepairmentTime = ((healthAmountToRestore.minus(currentFortHealth)).dividedBy(totalRegenerationPerSecond)).integerValue(BigNumber.ROUND_FLOOR);

    let maxResourceAmount = new BigNumber(0);
    for (let i = 0; i < spendingResourceConfigs.length; i++) {
      const spendingResourceBalance = fortRepairmentTime.multipliedBy(toLowBN(spendingResourceConfigs[i].perTick).multipliedBy(investWorkerQuantity));
      maxResourceAmount = BigNumber.max(maxResourceAmount, spendingResourceBalance);
    }

    await settlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      fort.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(maxResourceAmount))
    ).then(tx => tx.wait());

    await EvmUtils.increaseTime(fortRepairmentTime.toNumber());

    await fort.removeResourcesAndWorkers(
      settlementInstance.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      await settlementInstance.signer.getAddress(),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(maxResourceAmount))
    ).then(tx => tx.wait());

    await fort.updateState().then(tx => tx.wait());
  }

  public static async getFortRegenerationPerSecond(
    fortInstance: Fort,
    regenerationTime: number
  ) {
    const fortHealthBeforeRepairment = toLowBN(await fortInstance.health());

    const buildingLastUpdateStateTimeBeforeProduction = toBN((await fortInstance.production()).lastUpdateStateTime);

    await EvmUtils.increaseTime(regenerationTime);
    await fortInstance.updateState().then((tx) => tx.wait());

    const buildingLastUpdateStateTimeAfterProduction = toBN((await fortInstance.production()).lastUpdateStateTime);

    const timePassedDuringRegeneration = buildingLastUpdateStateTimeAfterProduction.minus(buildingLastUpdateStateTimeBeforeProduction);

    const fortHealthAfterRepairment = toLowBN(await fortInstance.health());

    const regeneratedHealth = fortHealthAfterRepairment.minus(fortHealthBeforeRepairment);

    return regeneratedHealth.dividedBy(timePassedDuringRegeneration);
  }

  public static async getSettlementFortDestructionTime(
    settlementInstance: Settlement
  ) {
    const siegeInstance = Siege__factory.connect(await settlementInstance.siege(), settlementInstance.signer);

    const fort = await SettlementHelper.getFort(settlementInstance);
    const productionConfig = await fort.getConfig();
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const fortHealthBeforeDestruction = toLowBN(await fort.health());

    const totalSiegePowerPerSecond = toLowBN((await siegeInstance.calculateTotalSiegeStats())._power);
    const buildingProductionMultiplier = toLowBN(await fort.getWorkers());
    const basicProductionMultiplier = await ProductionHelper.getBasicProductionMultiplier(settlementInstance, BuildingType.FORT);
    const fortRegenerationPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy(buildingProductionMultiplier);
    const fortPassiveRegenerationPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy(basicProductionMultiplier);
    const totalRegenerationPerSecond = fortRegenerationPerSecond.plus(fortPassiveRegenerationPerSecond);

    const realDestructionPerSecond = new BigNumber(totalSiegePowerPerSecond).minus(totalRegenerationPerSecond);

    return (fortHealthBeforeDestruction.dividedBy(realDestructionPerSecond)).integerValue(BigNumber.ROUND_CEIL);
  }

  public static async getSettlementFortTokenRegenerationTime(
    settlementInstance: Settlement,
    tokenAmountToReceive: number
  ) {
    const registryInstance = await WorldHelper.getRegistryInstance();
    const siegeInstance = Siege__factory.connect(await settlementInstance.siege(), settlementInstance.signer);

    const fort = await SettlementHelper.getFort(settlementInstance);
    const productionConfig = await fort.getConfig();
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const siegePowerToSiegePointsMultiplier = toLowBN(await registryInstance.getSiegePowerToSiegePointsMultiplier());
    const totalSiegePowerPerSecond = toLowBN((await siegeInstance.calculateTotalSiegeStats())._power);
    const buildingProductionMultiplier = toLowBN(await fort.getWorkers());
    const basicProductionMultiplier = await ProductionHelper.getBasicProductionMultiplier(settlementInstance, BuildingType.FORT);
    const fortRegenerationPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy(buildingProductionMultiplier);
    const fortPassiveRegenerationPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy(basicProductionMultiplier);
    const totalRegenerationPerSecond = fortRegenerationPerSecond.plus(fortPassiveRegenerationPerSecond);

    const realDestructionPerSecond = new BigNumber(totalSiegePowerPerSecond).minus(totalRegenerationPerSecond);

    return ((new BigNumber(tokenAmountToReceive).dividedBy(siegePowerToSiegePointsMultiplier)).dividedBy(realDestructionPerSecond)).integerValue(BigNumber.ROUND_CEIL);
  }
}
