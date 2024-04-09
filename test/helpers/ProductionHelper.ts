import { Settlement } from "../../typechain-types";
import { _1e18, toBN, toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import BigNumber from "bignumber.js";
import { EvmUtils } from "./EvmUtils";
import { expect } from "chai";
import { ResourceHelper } from "./ResourceHelper";
import { ResourceType } from "../enums/resourceType";
import { BuildingType } from "../enums/buildingType";
import { BuildingHelper } from "./BuildingHelper";
import { WorldHelper } from "./WorldHelper";
import { ethers } from "hardhat";

export class ProductionHelper {
  public static async produceResourcesForSpecifiedDuration(
    settlementInstance: Settlement,
    buildingType: BuildingType,
    investResourceQuantity: number,
    investWorkerQuantity: number,
    productionTime: number
  ) {
    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(settlementInstance, buildingType);

    const productionConfig = await buildingInstance.getConfig();
    const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);

    await settlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      buildingInstance.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    await EvmUtils.increaseTime(productionTime);

    await buildingInstance.removeResourcesAndWorkers(
      settlementInstance.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      await settlementInstance.signer.getAddress(),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    await buildingInstance.updateState().then(tx => tx.wait());
  }

  public static async produceResources(
    settlementInstance: Settlement,
    buildingType: BuildingType,
    investWorkerQuantity: number,
    resourceAmountToProduce: BigNumber
  ) {
    const registryInstance = await WorldHelper.getRegistryInstance();

    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(settlementInstance, buildingType);
    const ticksPerSecond = toBN(await registryInstance.getProductionTicksInSecond());

    const productionConfig = await buildingInstance.getConfig();
    const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const basicProductionMultiplier = await ProductionHelper.getBasicProductionMultiplier(settlementInstance, buildingType);
    const passiveProductionPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy(basicProductionMultiplier);
    const productionPerSecond = toLowBN(producingResourceConfig!.perTick).multipliedBy(investWorkerQuantity);
    const totalProductionPerSecond = (productionPerSecond.plus(passiveProductionPerSecond));


    let maxSpendingResourcePerTick = new BigNumber(0);
    for (let i = 0; i < spendingResourceConfigs.length; i++) {
      const spendingResourcePerTick = toLowBN(spendingResourceConfigs[i].perTick);
      maxSpendingResourcePerTick = BigNumber.max(maxSpendingResourcePerTick, spendingResourcePerTick);
    }

    const productionRatio = toLowBN(producingResourceConfig!.perTick).dividedBy(maxSpendingResourcePerTick);
    const spendingResourceAmount = resourceAmountToProduce.dividedBy(productionRatio);

    const productionTime = ((resourceAmountToProduce).dividedBy(totalProductionPerSecond).dividedBy(ticksPerSecond)).integerValue(BigNumber.ROUND_FLOOR);

    await settlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      buildingInstance.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(spendingResourceAmount))
    ).then(tx => tx.wait());

    await EvmUtils.increaseTime(productionTime.toNumber());

    await buildingInstance.removeResourcesAndWorkers(
      settlementInstance.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      await settlementInstance.signer.getAddress(),
      [],
      []
    ).then(tx => tx.wait());
  }

  public static async increaseProsperityByBuilding(
    settlementInstance: Settlement,
    buildingType: BuildingType,
    prosperityAmount: number
  ) {
    const registryInstance = await WorldHelper.getRegistryInstance();

    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(settlementInstance, buildingType);

    const productionConfig = await buildingInstance.getConfig();
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    const producingResourceName = producingResourceConfig!.resourceName;
    expect(producingResourceConfig).to.exist;

    const resourceWeight = toBN(await registryInstance.getResourceWeight(producingResourceName));
    const toTreasuryPercent = toLowBN(await registryInstance.getToTreasuryPercent());
    const buildingCoefficient = await BuildingHelper.getBuildingCoefficient(toBN(await buildingInstance.getBuildingLevel()));
    const ticksPerSecond = toBN(await registryInstance.getProductionTicksInSecond());

    const resourceQuantity = new BigNumber(prosperityAmount).dividedBy(resourceWeight.multipliedBy(toTreasuryPercent.dividedBy(buildingCoefficient)));
    const workerQuantity = toLowBN(await buildingInstance.getMaxWorkers());

    const basicProductionMultiplier = await ProductionHelper.getBasicProductionMultiplier(settlementInstance, buildingType);
    const basicProductionPerTick = toLowBN(producingResourceConfig!.perTick).multipliedBy(basicProductionMultiplier);
    const advancedProductionPerTick = toLowBN(producingResourceConfig!.perTick).multipliedBy(workerQuantity);
    const productionPerTick = basicProductionPerTick.plus(advancedProductionPerTick);
    const productionTime = resourceQuantity.dividedBy(productionPerTick.multipliedBy(ticksPerSecond));

    await ProductionHelper.produceResourcesForSpecifiedDuration(
      settlementInstance,
      buildingType,
      resourceQuantity.toNumber(),
      workerQuantity.toNumber(),
      productionTime.integerValue().toNumber()
    );
  }

  public static async getBasicProductionMultiplier(
    settlementInstance: Settlement,
    buildingType: BuildingType
  ) {
    const registryInstance = await WorldHelper.getRegistryInstance();

    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(settlementInstance, buildingType);

    const basicProductionCoefficient = toBN((await buildingInstance.basicProduction()).coefficient);
    const basicProductionBuildingCoefficient = toLowBN(await registryInstance.getBasicProductionBuildingCoefficient(buildingType));
    const workerCapacityCoefficient = toLowBN(await registryInstance.getWorkerCapacityCoefficient(buildingType));
    const globalMultiplier = toBN(await registryInstance.getGlobalMultiplier());

    return basicProductionCoefficient.multipliedBy(basicProductionBuildingCoefficient.multipliedBy(workerCapacityCoefficient.multipliedBy(globalMultiplier)));
  }

  public static async getProductionPerSecond(
    settlementInstance: Settlement,
    buildingType: BuildingType,
    productionTime: number
  ) {
    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(settlementInstance, buildingType);

    const productionConfig = await buildingInstance.getConfig();
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    const producingResourceName = producingResourceConfig!.resourceName;
    expect(producingResourceConfig).to.exist;

    await buildingInstance.distributeToAllShareholders().then(tx => tx.wait());

    const buildingResourceQuantityBeforeProduction = await ResourceHelper.getResourceStateBalanceOf(
      buildingInstance.address,
      producingResourceName as ResourceType
    );

    const userResourceQuantityBeforeProduction = await ResourceHelper.getResourceQuantity(
      await settlementInstance.signer.getAddress(),
      producingResourceName as ResourceType
    );

    const buildingLastUpdateStateZoneTimeBeforeProduction = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

    await EvmUtils.increaseTime(productionTime);
    await buildingInstance.distributeToAllShareholders().then(tx => tx.wait());

    const buildingLastUpdateStateZoneTimeAfterProduction = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

    const timePassedDuringProduction = buildingLastUpdateStateZoneTimeAfterProduction.minus(buildingLastUpdateStateZoneTimeBeforeProduction);
    const timeSecondsPassedDuringProduction = timePassedDuringProduction.dividedBy(_1e18);

    const buildingResourceQuantityAfterProduction = await ResourceHelper.getResourceStateBalanceOf(
      buildingInstance.address,
      producingResourceName as ResourceType
    );

    const userResourceQuantityAfterProduction = await ResourceHelper.getResourceQuantity(
      await settlementInstance.signer.getAddress(),
      producingResourceName as ResourceType
    );

    const producedRes = (buildingResourceQuantityAfterProduction.plus(userResourceQuantityAfterProduction)).minus(
      (buildingResourceQuantityBeforeProduction.plus(userResourceQuantityBeforeProduction)));

    return producedRes.dividedBy(timeSecondsPassedDuringProduction);
  }

  public static async getProductionSlowdownPercentage(
    settlementInstance: Settlement,
    buildingType: BuildingType
  ) {
    const investResourceQuantity = 500;
    const productionTime = 100;

    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(settlementInstance, buildingType);

    const investWorkerQuantity = toLowBN(await buildingInstance.getMaxWorkers());

    const productionConfig = await buildingInstance.getConfig();
    const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);

    await settlementInstance.assignResourcesAndWorkersToBuilding(
      ethers.constants.AddressZero.toString(),
      buildingInstance.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    const buildingLastUpdateStateTimeBefore = toBN((await buildingInstance.production()).lastUpdateStateTime);
    const buildingLastUpdateStateZoneTimeBefore = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

    await EvmUtils.increaseTime(productionTime);

    await buildingInstance.removeResourcesAndWorkers(
      settlementInstance.address,
      transferableFromLowBN(new BigNumber(investWorkerQuantity)),
      await settlementInstance.signer.getAddress(),
      spendingResourceConfigs.map((value) => value.resourceName),
      spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
    ).then(tx => tx.wait());

    await buildingInstance.updateState().then(tx => tx.wait());

    const buildingLastUpdateStateTimeAfter = toBN((await buildingInstance.production()).lastUpdateStateTime);
    const buildingLastUpdateStateZoneTimeAfter = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

    const timePassed = buildingLastUpdateStateTimeAfter.minus(buildingLastUpdateStateTimeBefore);
    const zoneTimePassed = buildingLastUpdateStateZoneTimeAfter.minus(buildingLastUpdateStateZoneTimeBefore);
    const zoneTimeSecondsPassed = zoneTimePassed.dividedBy(_1e18);
    return (new BigNumber(1).minus(zoneTimeSecondsPassed.dividedBy(timePassed))).multipliedBy(100);
  }

  public static async increaseToxicityBySettlement(
    settlementInstance: Settlement,
    toxicityAmount: number
  ) {
    const registryInstance = await WorldHelper.getRegistryInstance();

    const buildingType = BuildingType.SMITHY;
    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(settlementInstance, buildingType);

    const productionConfig = await buildingInstance.getConfig();
    const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    const producingResourceName = producingResourceConfig!.resourceName;
    expect(producingResourceConfig).to.exist;

    const workersCap = toLowBN(await buildingInstance.getMaxWorkers());
    const producingResourceToxicity = toLowBN(await registryInstance.getToxicityByResource(producingResourceName));

    let totalSpendingResourceToxicity = new BigNumber(0);
    for (let i = 0; i < spendingResourceConfigs.length; i++) {
      const resourceToxicity = toLowBN(await registryInstance.getToxicityByResource(spendingResourceConfigs[i].resourceName));
      totalSpendingResourceToxicity = totalSpendingResourceToxicity.plus(resourceToxicity);
    }

    const resourceAmountToProduce = new BigNumber(toxicityAmount).multipliedBy(producingResourceToxicity).dividedBy(totalSpendingResourceToxicity);

    await ProductionHelper.produceResources(settlementInstance, buildingType, workersCap.toNumber(), resourceAmountToProduce);
  }
}