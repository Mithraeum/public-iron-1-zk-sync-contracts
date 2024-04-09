import { ethers, getNamedAccounts } from "hardhat";
import { IERC20__factory, Zone__factory } from "../../typechain-types";
import { UserHelper } from "../helpers/UserHelper";
import { expect } from "chai";
import { toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import { ResourceHelper } from "../helpers/ResourceHelper";
import BigNumber from "bignumber.js";
import { WorldHelper } from "../helpers/WorldHelper";
import { ResourceType } from "../enums/resourceType";
import { BuildingType } from "../enums/buildingType";
import { BuildingHelper } from "../helpers/BuildingHelper";

export class ResourceCoreTest {
    public static async resourceInvestTest(buildingType: BuildingType){
        const { testUser1 } = await getNamedAccounts();

        const investQuantity = 100;

        const worldInstance = await WorldHelper.getWorldInstance(testUser1);
        const registryInstance = await WorldHelper.getRegistryInstance();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const zoneAddress = await userSettlementInstance.currentZone();
        const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);

        const productionConfig = await buildingInstance.getConfig();
        const spendingResourceConfigs = productionConfig.filter(config => !config.isProducing);

        const epochNumber = await WorldHelper.getCurrentEpochNumber();

        let totalResourceToxicity = new BigNumber(0);
        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            const resourceToxicity = toLowBN(await registryInstance.getToxicityByResource(spendingResourceConfigs[i].resourceName));
            totalResourceToxicity = totalResourceToxicity.plus(resourceToxicity.multipliedBy(investQuantity));
        }

        const zoneToxicityBefore = toLowBN(await zoneInstance.toxicity());

        const resourcesBefore = await ResourceHelper.getResourcesQuantity(
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const buildingResourcesBefore = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        //resource investment
        await worldInstance.batchTransferResources(
            epochNumber,
            buildingInstance.address,
            spendingResourceConfigs.map(value => value.resourceName),
            spendingResourceConfigs.map(value => transferableFromLowBN(new BigNumber(investQuantity)))
        ).then(tx => tx.wait());

        const actualZoneToxicity = toLowBN(await zoneInstance.toxicity());

        const actualResources = await ResourceHelper.getResourcesQuantity(
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const actualBuildingResources = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            expect(actualResources[spendingResourceConfigs[i].resourceName]).eql(
              resourcesBefore[spendingResourceConfigs[i].resourceName].minus(investQuantity));
            expect(actualBuildingResources[spendingResourceConfigs[i].resourceName]).eql(
              buildingResourcesBefore[spendingResourceConfigs[i].resourceName].plus(investQuantity));
        }
        expect(actualZoneToxicity).isInCloseRangeWith(zoneToxicityBefore.minus(totalResourceToxicity));
    }

    public static async resourceInvestFromAnotherUserTest(buildingType: BuildingType){
        const { testUser1, testUser2 } = await getNamedAccounts();
        const signer = await ethers.getSigner(testUser2);

        const investQuantity = 100;

        const registryInstance = await WorldHelper.getRegistryInstance();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);
        const zoneAddress = await userSettlementInstance.currentZone();
        const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);

        const productionConfig = await buildingInstance.getConfig();
        const spendingResourceConfigs = productionConfig.filter(config => !config.isProducing);

        const epochInstance = await WorldHelper.getCurrentEpochInstance();

        let totalResourceToxicity = new BigNumber(0);
        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            const resourceToxicity = toLowBN(await registryInstance.getToxicityByResource(spendingResourceConfigs[i].resourceName));
            totalResourceToxicity = totalResourceToxicity.plus(resourceToxicity.multipliedBy(investQuantity));
        }

        const zoneToxicityBefore = toLowBN(await zoneInstance.toxicity());

        const resourcesBefore = await ResourceHelper.getResourcesQuantity(
          testUser2,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const buildingResourcesBefore = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            const tokenAddress = await epochInstance.resources(spendingResourceConfigs[i].resourceName);
            const tokenInstance = IERC20__factory.connect(tokenAddress, signer);
            await tokenInstance.approve(testUser1, transferableFromLowBN(new BigNumber(investQuantity))).then((tx) => tx.wait());
        }

        //resource investment
        await userSettlementInstance.assignResourcesAndWorkersToBuilding(
          testUser2,
          buildingInstance.address,
          transferableFromLowBN(new BigNumber(0)),
          spendingResourceConfigs.map((value) => value.resourceName),
          spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investQuantity)))
        ).then(tx => tx.wait());

        const actualZoneToxicity = toLowBN(await zoneInstance.toxicity());

        const actualResources = await ResourceHelper.getResourcesQuantity(
          testUser2,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const actualBuildingResources = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            expect(actualResources[spendingResourceConfigs[i].resourceName]).eql(
              resourcesBefore[spendingResourceConfigs[i].resourceName].minus(investQuantity));
            expect(actualBuildingResources[spendingResourceConfigs[i].resourceName]).eql(
              buildingResourcesBefore[spendingResourceConfigs[i].resourceName].plus(investQuantity));
        }
        expect(actualZoneToxicity).isInCloseRangeWith(zoneToxicityBefore.minus(totalResourceToxicity));
    }

    public static async impossibleResourceInvestFromAnotherUserWithoutApproveTest(buildingType: BuildingType){
        const { testUser1, testUser2 } = await getNamedAccounts();

        const investQuantity = 100;

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const productionConfig = await buildingInstance.getConfig();
        const spendingResourceConfigs = productionConfig.filter(config => !config.isProducing);

        await expect(
          userSettlementInstance.assignResourcesAndWorkersToBuilding(
            testUser2,
            buildingInstance.address,
            transferableFromLowBN(new BigNumber(0)),
            spendingResourceConfigs.map((value) => value.resourceName),
            spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investQuantity)))
          ).then(tx => tx.wait())
        ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: insufficient allowance'");
    }

    public static async notAcceptableResourceInvestTest(buildingType: BuildingType){
        const { testUser1 } = await getNamedAccounts();

        const notAcceptableResourceType = ResourceType.WEAPON;
        const investQuantity = 100;

        const worldInstance = await WorldHelper.getWorldInstance(testUser1);

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const epochNumber = await WorldHelper.getCurrentEpochNumber();

        await expect(
          worldInstance.batchTransferResources(
            epochNumber,
            buildingInstance.address,
            [notAcceptableResourceType],
            [transferableFromLowBN(new BigNumber(investQuantity))]
          ).then(tx => tx.wait())
        ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'resource is not acceptable'");
    }

    public static async impossibleResourceInvestMoreThanAvailableTest(buildingType: BuildingType){
        const { testUser1 } = await getNamedAccounts();

        const worldInstance = await WorldHelper.getWorldInstance(testUser1);

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const productionConfig = await buildingInstance.getConfig();
        const spendingResourceConfigs = productionConfig.filter(config => !config.isProducing);

        const epochNumber = await WorldHelper.getCurrentEpochNumber();

        const resourcesBefore = await ResourceHelper.getResourcesQuantity(
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const maxQuantityBetweenResources = BigNumber.max(...Object.values(resourcesBefore) as BigNumber[]);

        await expect(
          worldInstance.batchTransferResources(
            epochNumber,
            buildingInstance.address,
            spendingResourceConfigs.map(value => value.resourceName),
            spendingResourceConfigs.map(value => transferableFromLowBN(maxQuantityBetweenResources.plus(1)))
          ).then(tx => tx.wait())
        ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");
    }

    public static async resourceWithdrawTest(buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const investQuantity = 100;

        const worldInstance = await WorldHelper.getWorldInstance(testUser1);
        const registryInstance = await WorldHelper.getRegistryInstance();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const zoneAddress = await userSettlementInstance.currentZone();
        const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);

        const productionConfig = await buildingInstance.getConfig();
        const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);

        const epochNumber = await WorldHelper.getCurrentEpochNumber();

        let totalResourceToxicity = new BigNumber(0);
        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            const resourceToxicity = toLowBN(await registryInstance.getToxicityByResource(spendingResourceConfigs[i].resourceName));
            totalResourceToxicity = totalResourceToxicity.plus(resourceToxicity.multipliedBy(investQuantity));
        }

        //resource investment
        await worldInstance.batchTransferResources(
          epochNumber,
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName),
          spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investQuantity)))
        ).then(tx => tx.wait());

        const zoneToxicityBefore = toLowBN(await zoneInstance.toxicity());

        const resourcesBefore = await ResourceHelper.getResourcesQuantity(
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const buildingResourcesBefore = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        //withdraw resources
        await buildingInstance.removeResourcesAndWorkers(
          userSettlementInstance.address,
          transferableFromLowBN(new BigNumber(0)),
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName),
          spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investQuantity)))
        ).then(tx => tx.wait());

        const actualZoneToxicity = toLowBN(await zoneInstance.toxicity());

        const actualResources = await ResourceHelper.getResourcesQuantity(
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const actualBuildingResources = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            expect(actualResources[spendingResourceConfigs[i].resourceName]).eql(
              resourcesBefore[spendingResourceConfigs[i].resourceName].plus(investQuantity));
            expect(actualBuildingResources[spendingResourceConfigs[i].resourceName]).eql(
              buildingResourcesBefore[spendingResourceConfigs[i].resourceName].minus(investQuantity));
        }
        expect(actualZoneToxicity).isInCloseRangeWith(totalResourceToxicity.plus(zoneToxicityBefore));
    }

    public static async impossibleResourceWithdrawMoreThanInvestedTest(buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const investQuantity = 100;

        const worldInstance = await WorldHelper.getWorldInstance(testUser1);

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const productionConfig = await buildingInstance.getConfig();
        const spendingResourceConfigs = productionConfig.filter((config) => !config.isProducing);

        const epochNumber = await WorldHelper.getCurrentEpochNumber();

        //resource investment
        await worldInstance.batchTransferResources(
          epochNumber,
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName),
          spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investQuantity)))
        ).then(tx => tx.wait());

        const resourcesBefore = await ResourceHelper.getResourcesQuantity(
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const buildingResourcesBefore = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        await buildingInstance.removeResourcesAndWorkers(
          userSettlementInstance.address,
          transferableFromLowBN(new BigNumber(0)),
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName),
          spendingResourceConfigs.map((value) => transferableFromLowBN(new BigNumber(investQuantity).plus(1)))
        ).then(tx => tx.wait());

        const actualResources = await ResourceHelper.getResourcesQuantity(
          testUser1,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        const actualBuildingResources = await ResourceHelper.getResourcesQuantity(
          buildingInstance.address,
          spendingResourceConfigs.map((value) => value.resourceName as ResourceType)
        );

        for (let i = 0; i < spendingResourceConfigs.length; i++) {
            expect(actualResources[spendingResourceConfigs[i].resourceName]).eql(
              resourcesBefore[spendingResourceConfigs[i].resourceName].plus(investQuantity));
            expect(actualBuildingResources[spendingResourceConfigs[i].resourceName]).eql(
              buildingResourcesBefore[spendingResourceConfigs[i].resourceName].minus(investQuantity));
        }
    }
}
