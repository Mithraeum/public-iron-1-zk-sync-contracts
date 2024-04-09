import { ethers, getNamedAccounts } from "hardhat";
import {
    CultistsSettlement__factory,
    Units__factory,
    Zone__factory
} from "../../typechain-types";
import { UserHelper } from "../helpers/UserHelper";
import { expect } from "chai";
import { _1e18, toBN, toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import { EvmUtils } from "../helpers/EvmUtils";
import BigNumber from "bignumber.js";
import { WorldHelper } from "../helpers/WorldHelper";
import { BuildingType } from "../enums/buildingType";
import { ResourceHelper } from "../helpers/ResourceHelper";
import { ResourceType } from "../enums/resourceType";
import { ProductionHelper } from "../helpers/ProductionHelper";
import { BuildingHelper } from "../helpers/BuildingHelper";

export class ProductionCoreTest {
    public static async productionTest(investWorkerQuantity: number, buildingLevel: number, buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const investResourceQuantity = 100;
        const productionTime = 100;

        const registryInstance = await WorldHelper.getRegistryInstance();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);
        const ticksPerSecond = toBN(await registryInstance.getProductionTicksInSecond());

        await BuildingHelper.upgradeBuildingToSpecifiedLevel(buildingInstance, buildingLevel, true);

        const productionConfig = await buildingInstance.getConfig();
        const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
        const producingResourceConfig = productionConfig.find((config) => config.isProducing);
        const producingResourceName = producingResourceConfig!.resourceName;
        expect(producingResourceConfig).to.exist;

        const buildingResourceQuantityBeforeBasicProduction = await ResourceHelper.getResourceStateBalanceOf(
          buildingInstance.address,
          producingResourceName as ResourceType
        );

        const userResourceQuantityBeforeBasicProduction = await ResourceHelper.getResourceQuantity(
          testUser1,
          producingResourceName as ResourceType
        );

        const buildingLastUpdateStateZoneTimeBefore = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

        await EvmUtils.increaseTime(productionTime);
        await buildingInstance.distributeToAllShareholders().then(tx => tx.wait());

        const buildingLastUpdateStateZoneTimeAfter = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

        const buildingResourceQuantityAfterBasicProduction = await ResourceHelper.getResourceStateBalanceOf(
          buildingInstance.address,
          producingResourceName as ResourceType
        );

        const userResourceQuantityAfterBasicProduction = await ResourceHelper.getResourceQuantity(
          testUser1,
          producingResourceName as ResourceType
        );

        const zoneTimePassedDuringBasicProduction = buildingLastUpdateStateZoneTimeAfter.minus(buildingLastUpdateStateZoneTimeBefore);
        const zoneTimeSecondsPassedDuringBasicProduction = zoneTimePassedDuringBasicProduction.dividedBy(_1e18);
        const ticksPassedDuringBasicProduction = zoneTimeSecondsPassedDuringBasicProduction.multipliedBy(ticksPerSecond);

        const basicProductionMultiplier = await ProductionHelper.getBasicProductionMultiplier(userSettlementInstance, buildingType);
        const toBeBasicProducedRes = ticksPassedDuringBasicProduction.multipliedBy(toLowBN(producingResourceConfig!.perTick)).multipliedBy(basicProductionMultiplier);

        const basicProducedRes = (buildingResourceQuantityAfterBasicProduction.plus(userResourceQuantityAfterBasicProduction)).minus(
          (buildingResourceQuantityBeforeBasicProduction.plus(userResourceQuantityBeforeBasicProduction)));
        expect(basicProducedRes).eql(toBeBasicProducedRes, 'Resource Quantity is not correct');

        await userSettlementInstance.assignResourcesAndWorkersToBuilding(
          ethers.constants.AddressZero.toString(),
          buildingInstance.address,
          transferableFromLowBN(new BigNumber(investWorkerQuantity)),
          spendingResourceConfigs.map((value) => value.resourceName),
          spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
        ).then(tx => tx.wait());

        const spendingResourceQuantityBeforeAdvancedProduction = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const buildingLastUpdateStateZoneTimeBeforeInvestment = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

        await EvmUtils.increaseTime(productionTime);

        let minTicks = new BigNumber("Infinity");
        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            const spendingResourceBalance = await ResourceHelper.getResourceStateBalanceOf(buildingInstance.address, spendingResourceConfigs[i].resourceName as ResourceType);
            const spendingResourceTicksLeft = spendingResourceBalance.dividedToIntegerBy(toLowBN(spendingResourceConfigs[i].perTick));
            minTicks = BigNumber.min(minTicks, spendingResourceTicksLeft);
        }

        await buildingInstance.distributeToAllShareholders().then(tx => tx.wait());

        const buildingLastUpdateStateZoneTimeAfterInvestment = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

        const zoneTimePassedFromInvestment = buildingLastUpdateStateZoneTimeAfterInvestment.minus(buildingLastUpdateStateZoneTimeBeforeInvestment);
        const zoneTimeSecondsPassedFromInvestment = zoneTimePassedFromInvestment.dividedBy(_1e18);
        const ticksPassedFromInvestment = zoneTimeSecondsPassedFromInvestment.multipliedBy(ticksPerSecond);

        const toBeProducedTicks = BigNumber.min(ticksPassedFromInvestment, minTicks);

        const toBeAdvancedProducedRes = toBeProducedTicks.multipliedBy(toLowBN(producingResourceConfig!.perTick)).multipliedBy(investWorkerQuantity);

        const zoneTimePassedDuringAllTime = buildingLastUpdateStateZoneTimeAfterInvestment.minus(buildingLastUpdateStateZoneTimeBefore);
        const zoneTimeSecondsPassedDuringAllTime = zoneTimePassedDuringAllTime.dividedBy(_1e18);
        const ticksPassedDuringAllTime = zoneTimeSecondsPassedDuringAllTime.multipliedBy(ticksPerSecond);
        const toBeBasicProducedResDuringAllTime = ticksPassedDuringAllTime.multipliedBy(toLowBN(producingResourceConfig!.perTick)).multipliedBy(basicProductionMultiplier);
        const toBeTotalProducedRes = toBeAdvancedProducedRes.plus(toBeBasicProducedResDuringAllTime);

        const spendingResourceQuantityAfterAdvancedProduction = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const buildingResourceQuantityAfterAdvancedProduction = await ResourceHelper.getResourceStateBalanceOf(
          buildingInstance.address,
          producingResourceName as ResourceType
        );

        const userResourceQuantityAfterAdvancedProduction = await ResourceHelper.getResourceQuantity(
          testUser1,
          producingResourceName as ResourceType
        );

        const actualTotalProducedRes = (buildingResourceQuantityAfterAdvancedProduction.plus(userResourceQuantityAfterAdvancedProduction)).minus((buildingResourceQuantityBeforeBasicProduction.plus(userResourceQuantityBeforeBasicProduction)));

        if (buildingType !== BuildingType.FARM) {
            let toBeAdvancedSpentRes = new BigNumber("Infinity");
            for (let i = 0; i < spendingResourceConfigs.length; i++) {
                const resourceQuantity = spendingResourceQuantityBeforeAdvancedProduction[spendingResourceConfigs[i].resourceName].minus(
                  spendingResourceQuantityAfterAdvancedProduction[spendingResourceConfigs[i].resourceName]);
                toBeAdvancedSpentRes = BigNumber.min(toBeAdvancedSpentRes, resourceQuantity);
            }
            expect(toBeAdvancedProducedRes).eql(toBeAdvancedSpentRes, 'Resource Quantity is not correct');
        }
        expect(actualTotalProducedRes).eql(toBeTotalProducedRes, 'Resource Quantity is not correct');
    }

    public static async harvestTest(investWorkerQuantity: number, buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const investResourceQuantity = 100;

        const registryInstance = await WorldHelper.getRegistryInstance();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);
        const prosperityInstance = await WorldHelper.getProsperityInstance();

        const productionConfig = await buildingInstance.getConfig();
        const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
        const producingResourceConfig = productionConfig.find((config) => config.isProducing);
        const producingResourceName = producingResourceConfig!.resourceName;
        expect(producingResourceConfig).to.exist;

        const buildingLastUpdateStateZoneTimeBefore = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

        const maxTreasuryBalance = toLowBN(await buildingInstance.getMaxTreasuryByLevel(2));
        const currentTreasuryBalance = await ResourceHelper.getResourceStateBalanceOf(buildingInstance.address, producingResourceName as ResourceType);
        const availableTreasuryBalance = maxTreasuryBalance.minus(currentTreasuryBalance);
        const prosperityBefore = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
        const resourceQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, producingResourceName);

        await userSettlementInstance.assignResourcesAndWorkersToBuilding(
          ethers.constants.AddressZero.toString(),
          buildingInstance.address,
          transferableFromLowBN(new BigNumber(investWorkerQuantity)),
          spendingResourceConfigs.map((value) => value.resourceName),
          spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
        ).then(tx => tx.wait());

        const buildingLastUpdateStateZoneTimeFromInvestment = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

        await EvmUtils.increaseTime(100);

        let minTicks = new BigNumber("Infinity");
        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            const spendingResourceBalance = await ResourceHelper.getResourceStateBalanceOf(buildingInstance.address, spendingResourceConfigs[i].resourceName as ResourceType);
            const spendingResourceTicksLeft = spendingResourceBalance.dividedToIntegerBy(toLowBN(spendingResourceConfigs[i].perTick));
            minTicks = BigNumber.min(minTicks, spendingResourceTicksLeft);
        }

        await buildingInstance.distributeToAllShareholders().then(tx => tx.wait());

        const buildingLastUpdateStateZoneTimeAfter = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

        const ticksPerSecond = toBN(await registryInstance.getProductionTicksInSecond());

        const zoneTimePassed = buildingLastUpdateStateZoneTimeAfter.minus(buildingLastUpdateStateZoneTimeBefore);
        const zoneTimeSecondsPassed = zoneTimePassed.dividedBy(_1e18);
        const ticksPassed = zoneTimeSecondsPassed.multipliedBy(ticksPerSecond);

        const zoneTimePassedFromInvestment = buildingLastUpdateStateZoneTimeAfter.minus(buildingLastUpdateStateZoneTimeFromInvestment);
        const zoneTimeSecondsPassedFromInvestment = zoneTimePassedFromInvestment.dividedBy(_1e18);
        const ticksPassedFromInvestment = zoneTimeSecondsPassedFromInvestment.multipliedBy(ticksPerSecond);

        const basicProductionMultiplier = await ProductionHelper.getBasicProductionMultiplier(userSettlementInstance, buildingType);
        const toBeBasicProducedRes = ticksPassed.multipliedBy(toLowBN(producingResourceConfig!.perTick)).multipliedBy(basicProductionMultiplier);

        const toBeProducedTicks = BigNumber.min(ticksPassedFromInvestment, minTicks);

        const toBeAdvancedProducedRes = toBeProducedTicks.multipliedBy(toLowBN(producingResourceConfig!.perTick)).multipliedBy(investWorkerQuantity);

        const toBeProducedRes = toBeBasicProducedRes.plus(toBeAdvancedProducedRes);

        const toReservePercent = toLowBN(await registryInstance.getToTreasuryPercent());
        const toReserveWillGo = BigNumber.min(toBeProducedRes.multipliedBy(toReservePercent), availableTreasuryBalance);
        const toWalletWillGo = toBeProducedRes.minus(toReserveWillGo);

        const resourceWeight = toBN(await registryInstance.getResourceWeight(producingResourceName));
        const buildingCoefficient = await BuildingHelper.getBuildingCoefficient(toBN(await buildingInstance.getBuildingLevel()));
        const expectedProducedProsperity = buildingType === BuildingType.FARM
          ? new BigNumber(0)
          : resourceWeight.multipliedBy(toReserveWillGo.dividedBy(buildingCoefficient));

        const expectedProsperityBalance = prosperityBefore.plus(expectedProducedProsperity);
        const expectedTreasuryBalance = currentTreasuryBalance.plus(toReserveWillGo);
        const expectedResourceQuantity = resourceQuantityBefore.plus(toWalletWillGo);

        const actualProsperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
        const actualTreasuryBalance = await ResourceHelper.getResourceStateBalanceOf(buildingInstance.address, producingResourceName as ResourceType);
        const actualResourceQuantity = await ResourceHelper.getResourceQuantity(testUser1, producingResourceName);

        expect(actualProsperityBalance).eql(expectedProsperityBalance, 'Prosperity Balance after harvest is not correct');
        expect(actualTreasuryBalance).eql(expectedTreasuryBalance, 'Treasury Balance after harvest is not correct');
        expect(actualResourceQuantity).eql(expectedResourceQuantity, 'Resource Quantity after harvest is not correct');
    }

    public static async productionPenaltyTest(buildingLevel: number, buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const investWorkerQuantity = 1;
        const investResourceQuantity = 5000;
        const productionTime = 20000000;

        const registryInstance = await WorldHelper.getRegistryInstance();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);
        const zoneAddress = await userSettlementInstance.currentZone();
        const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);
        const epochInstance = await WorldHelper.getCurrentEpochInstance();

        const cultistsSettlementAddress = await zoneInstance.cultistsSettlement();
        const cultistsSettlementInstance = CultistsSettlement__factory.connect(cultistsSettlementAddress, userSettlementInstance.signer);

        const cultistsArmyAddress = await cultistsSettlementInstance.army();

        const cultistUnitName = await registryInstance.getCultistUnitType();
        const cultistUnitAddress = await epochInstance.units(cultistUnitName);
        const cultistUnitInstance = Units__factory.connect(cultistUnitAddress, userSettlementInstance.signer);

        await BuildingHelper.upgradeBuildingToSpecifiedLevel(buildingInstance, buildingLevel, true);

        const productionConfig = await buildingInstance.getConfig();
        const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
        const producingResourceConfig = productionConfig.find((config) => config.isProducing);
        expect(producingResourceConfig).to.exist;

        //production without penalty
        await ProductionHelper.produceResourcesForSpecifiedDuration(userSettlementInstance, buildingType, investResourceQuantity, investWorkerQuantity, productionTime);

        const cultistUnitAmountBefore = toLowBN(await cultistUnitInstance.balanceOf(cultistsArmyAddress));

        //cultists summon
        const summonDelay = toBN(await registryInstance.getCultistsSummonDelay());
        await EvmUtils.increaseTime(summonDelay.toNumber());
        await zoneInstance.summonCultists().then((tx) => tx.wait());

        const cultistUnitAmountAfter = toLowBN(await cultistUnitInstance.balanceOf(cultistsArmyAddress));
        const actualSummonedCultists = cultistUnitAmountAfter.minus(cultistUnitAmountBefore);

        //production with penalty
        const resourcesBefore = await ResourceHelper.getResourcesQuantity(
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const buildingResourcesBefore = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        await userSettlementInstance.assignResourcesAndWorkersToBuilding(
          ethers.constants.AddressZero.toString(),
          buildingInstance.address,
          transferableFromLowBN(new BigNumber(investWorkerQuantity)),
          spendingResourceConfigs.map((value) => value.resourceName),
          spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
        ).then(tx => tx.wait());

        const actualResources = await ResourceHelper.getResourcesQuantity(
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const actualBuildingResources = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const buildingLastUpdateStateTimeBefore = toBN((await buildingInstance.production()).lastUpdateStateTime);
        const buildingLastUpdateStateZoneTimeBefore = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

        await EvmUtils.increaseTime(productionTime);

        await buildingInstance.removeResourcesAndWorkers(
          userSettlementInstance.address,
          transferableFromLowBN(new BigNumber(investWorkerQuantity)),
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName),
          spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
        ).then(tx => tx.wait());

        await buildingInstance.updateState().then(tx => tx.wait());

        const buildingLastUpdateStateTimeAfter = toBN((await buildingInstance.production()).lastUpdateStateTime);
        const buildingLastUpdateStateZoneTimeAfter = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

        const timePassedWithPenalty = buildingLastUpdateStateTimeAfter.minus(buildingLastUpdateStateTimeBefore);
        const zoneTimePassedWithPenalty = buildingLastUpdateStateZoneTimeAfter.minus(buildingLastUpdateStateZoneTimeBefore);
        const zoneTimeSecondsPassedWithPenalty = zoneTimePassedWithPenalty.dividedBy(_1e18);
        const expectedProductionSlowdownPercentage = new BigNumber(1).minus(actualSummonedCultists.dividedBy(10000));
        const actualProductionSlowdownPercentage = zoneTimeSecondsPassedWithPenalty.dividedBy(timePassedWithPenalty);

        expect(actualProductionSlowdownPercentage).eql(expectedProductionSlowdownPercentage, 'Production Slowdown Percentage is not correct');

        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            expect(actualResources[spendingResourceConfigs[i].resourceName]).eql(
              resourcesBefore[spendingResourceConfigs[i].resourceName].minus(investResourceQuantity));
            expect(actualBuildingResources[spendingResourceConfigs[i].resourceName]).eql(
              buildingResourcesBefore[spendingResourceConfigs[i].resourceName].plus(actualProductionSlowdownPercentage.multipliedBy(investResourceQuantity)));
        }
    }

    public static async resourceWithdrawDuringProductionTest(buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const investResourceQuantity = 5;

        const registryInstance = await WorldHelper.getRegistryInstance();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);
        const ticksPerSecond = toBN(await registryInstance.getProductionTicksInSecond());
        const actualWorkersCap = toLowBN(await buildingInstance.getMaxWorkers());

        const productionConfig = await buildingInstance.getConfig();
        const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);
        const producingResourceConfig = productionConfig.find((config) => config.isProducing);
        expect(producingResourceConfig).to.exist;

        const advancedProductionPerTick = toLowBN(producingResourceConfig!.perTick).multipliedBy(actualWorkersCap);
        const maxProduceTime = new BigNumber(investResourceQuantity).dividedBy(advancedProductionPerTick.multipliedBy(ticksPerSecond));
        const produceTimeBeforeWithdraw = maxProduceTime.dividedBy(5).integerValue();

        await userSettlementInstance.assignResourcesAndWorkersToBuilding(
          ethers.constants.AddressZero.toString(),
          buildingInstance.address,
          transferableFromLowBN(actualWorkersCap),
          spendingResourceConfigs.map((value) => value.resourceName),
          spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity)))
        ).then(tx => tx.wait());

        const buildingLastUpdateStateZoneTimeBeforeInvestment = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

        await EvmUtils.increaseTime(produceTimeBeforeWithdraw.toNumber());

        const spendingResourceQuantityBeforeWithdraw = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        //withdraw resources
        await buildingInstance.removeResourcesAndWorkers(
          userSettlementInstance.address,
          transferableFromLowBN(new BigNumber(0)),
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName),
          spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investResourceQuantity).dividedBy(2)))
        ).then(tx => tx.wait());

        await buildingInstance.updateState().then(tx => tx.wait());

        const buildingLastUpdateStateZoneTimeAfterInvestment = toBN((await buildingInstance.production()).lastUpdateStateZoneTime);

        const zoneTimePassed = buildingLastUpdateStateZoneTimeAfterInvestment.minus(buildingLastUpdateStateZoneTimeBeforeInvestment);
        const zoneTimeSecondsPassed = zoneTimePassed.dividedBy(_1e18);

        const spendingResourceQuantityAfterWithdraw = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            expect(spendingResourceQuantityAfterWithdraw[spendingResourceConfigs[i].resourceName]).lt(
              spendingResourceQuantityBeforeWithdraw[spendingResourceConfigs[i].resourceName])
        }

        let spendingResourceLeft = new BigNumber("Infinity");
        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            spendingResourceLeft = BigNumber.min(spendingResourceLeft, spendingResourceQuantityAfterWithdraw[spendingResourceConfigs[i].resourceName])
        }

        const produceTimeLeft = spendingResourceLeft.dividedBy(advancedProductionPerTick.multipliedBy(ticksPerSecond));
        expect(produceTimeLeft.plus(zoneTimeSecondsPassed)).isInCloseRangeWith(maxProduceTime.dividedBy(2));
    }
}
