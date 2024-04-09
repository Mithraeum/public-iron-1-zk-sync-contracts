import { ethers, getNamedAccounts } from "hardhat";
import { UserHelper } from "../helpers/UserHelper";
import { SettlementHelper } from "../helpers/SettlementHelper";
import { toBN, toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import { expect } from "chai";
import { ResourceHelper } from "../helpers/ResourceHelper";
import { BuildingType } from "../enums/buildingType";
import { ResourceType } from "../enums/resourceType";
import BigNumber from "bignumber.js";
import { BuildingHelper } from "../helpers/BuildingHelper";
import { WorldHelper } from "../helpers/WorldHelper";
import { IERC20__factory } from "../../typechain-types";

export class BuildingUpgradeCoreTest {
    public static async buildingBasicUpgradeTest(startLevel: number, buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        await BuildingHelper.upgradeBuildingToSpecifiedLevel(buildingInstance, startLevel, false);

        const buildingLevelBefore = toBN(await buildingInstance.getBuildingLevel());
        const basicProductionLevelBefore = toBN((await buildingInstance.basicProduction()).level);
        const woodQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WOOD);
        const upgradePrice = toLowBN(await buildingInstance.getUpgradePrice(startLevel));
        expect(woodQuantityBefore).gte(upgradePrice);

        const expectedBuildingLevel = buildingLevelBefore.plus(1);
        const expectedBasicProductionLevel = basicProductionLevelBefore.plus(1);
        const expectedTreasuryCap = toLowBN(await buildingInstance.getMaxTreasuryByLevel(expectedBuildingLevel.toNumber()));
        const expectedWoodQuantity = woodQuantityBefore.minus(upgradePrice);

        //basic upgrade
        await buildingInstance.startBasicUpgrade(ethers.constants.AddressZero.toString()).then(tx => tx.wait());

        const actualBuildingLevel = toBN(await buildingInstance.getBuildingLevel());
        const actualBasicProductionLevel = toBN((await buildingInstance.basicProduction()).level);
        const actualTreasuryCap = toLowBN(await buildingInstance.getMaxTreasuryByLevel(actualBuildingLevel.toNumber()));
        const actualWoodQuantity = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WOOD);

        expect(actualBuildingLevel).eql(expectedBuildingLevel, 'Building level after upgrade is not correct');
        expect(actualBasicProductionLevel).eql(expectedBasicProductionLevel, 'Basic production level is not correct');
        expect(actualTreasuryCap).eql(expectedTreasuryCap, 'Treasury cap after upgrade is not correct');
        expect(actualWoodQuantity).isInCloseRangeWith(expectedWoodQuantity);
    }

    public static async buildingAdvancedUpgradeTest(startLevel: number, buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const registryInstance = await WorldHelper.getRegistryInstance();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const buildingCoefficientBefore = await BuildingHelper.getBuildingCoefficient(new BigNumber(1));

        await BuildingHelper.upgradeBuildingToSpecifiedLevel(buildingInstance, startLevel, true);

        const buildingLevelBefore = toBN(await buildingInstance.getBuildingLevel());
        const advancedProductionLevelBefore = toBN((await buildingInstance.advancedProduction()).level);
        const oreQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.ORE);
        const upgradePrice = toLowBN(await buildingInstance.getUpgradePrice(startLevel));
        expect(oreQuantityBefore).gte(upgradePrice);

        const expectedBuildingLevel = buildingLevelBefore.plus(1);
        const expectedAdvancedProductionLevel = advancedProductionLevelBefore.plus(1);
        const buildingCoefficientAfter = await BuildingHelper.getBuildingCoefficient(expectedBuildingLevel);
        const buildingCoefficientMultiplier = buildingCoefficientAfter.minus(buildingCoefficientBefore);
        const expectedTreasuryCap = toLowBN(await buildingInstance.getMaxTreasuryByLevel(expectedBuildingLevel.toNumber()));
        const expectedOreQuantity = oreQuantityBefore.minus(upgradePrice);

        //advanced upgrade
        await buildingInstance.startAdvancedUpgrade(ethers.constants.AddressZero.toString()).then(tx => tx.wait());

        const workerCapacityCoefficient = toLowBN(await registryInstance.getWorkerCapacityCoefficient(buildingType));
        const actualBuildingLevel = toBN(await buildingInstance.getBuildingLevel());
        const actualAdvancedProductionLevel = toBN((await buildingInstance.advancedProduction()).level);
        const actualWorkersCap = toLowBN(await buildingInstance.getMaxWorkers());
        const actualTreasuryCap = toLowBN(await buildingInstance.getMaxTreasuryByLevel(actualBuildingLevel.toNumber()));
        const actualOreQuantity = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.ORE);

        expect(actualBuildingLevel).eql(expectedBuildingLevel, 'Building level after upgrade is not correct');
        expect(actualAdvancedProductionLevel).eql(expectedAdvancedProductionLevel, 'Advanced production level is not correct');
        expect(actualWorkersCap).eql(workerCapacityCoefficient.multipliedBy(buildingCoefficientMultiplier), 'Workers cap after upgrade is not correct');
        expect(actualTreasuryCap).eql(expectedTreasuryCap, 'Treasury cap after upgrade is not correct');
        expect(actualOreQuantity).isInCloseRangeWith(expectedOreQuantity);
    }

    public static async buildingBasicUpgradeByAnotherUserResourcesTest(buildingType: BuildingType) {
        const {testUser1, testUser2} = await getNamedAccounts();
        const signer = await ethers.getSigner(testUser2);

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);
        const epochInstance = await WorldHelper.getCurrentEpochInstance();

        const buildingLevelBefore = toBN(await buildingInstance.getBuildingLevel());
        const basicProductionLevelBefore = toBN((await buildingInstance.basicProduction()).level);
        const woodQuantityBefore = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.WOOD);
        const upgradePrice = toLowBN(await buildingInstance.getUpgradePrice(buildingLevelBefore.plus(1).toNumber()));
        expect(woodQuantityBefore).gte(upgradePrice);

        const expectedBuildingLevel = buildingLevelBefore.plus(1);
        const expectedBasicProductionLevel = basicProductionLevelBefore.plus(1);
        const expectedTreasuryCap = toLowBN(await buildingInstance.getMaxTreasuryByLevel(expectedBuildingLevel.toNumber()));
        const expectedWoodQuantity = woodQuantityBefore.minus(upgradePrice);

        const tokenAddress = await epochInstance.resources(ResourceType.WOOD);
        const tokenInstance = IERC20__factory.connect(tokenAddress, signer);
        await tokenInstance.approve(testUser1, transferableFromLowBN(upgradePrice)).then((tx) => tx.wait());

        //basic upgrade
        await buildingInstance.startBasicUpgrade(testUser2).then(tx => tx.wait());

        const actualBuildingLevel = toBN(await buildingInstance.getBuildingLevel());
        const actualBasicProductionLevel = toBN((await buildingInstance.basicProduction()).level);
        const actualTreasuryCap = toLowBN(await buildingInstance.getMaxTreasuryByLevel(actualBuildingLevel.toNumber()));
        const actualWoodQuantity = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.WOOD);

        expect(actualBuildingLevel).eql(expectedBuildingLevel, 'Building level after upgrade is not correct');
        expect(actualBasicProductionLevel).eql(expectedBasicProductionLevel, 'Basic production level is not correct');
        expect(actualTreasuryCap).eql(expectedTreasuryCap, 'Treasury cap after upgrade is not correct');
        expect(actualWoodQuantity).isInCloseRangeWith(expectedWoodQuantity);
    }

    public static async buildingAdvancedUpgradeByAnotherUserResourcesTest(buildingType: BuildingType) {
        const {testUser1, testUser2} = await getNamedAccounts();
        const signer = await ethers.getSigner(testUser2);

        const registryInstance = await WorldHelper.getRegistryInstance();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);
        const epochInstance = await WorldHelper.getCurrentEpochInstance();

        const buildingCoefficientBefore = await BuildingHelper.getBuildingCoefficient(new BigNumber(1));

        const buildingLevelBefore = toBN(await buildingInstance.getBuildingLevel());
        const advancedProductionLevelBefore = toBN((await buildingInstance.advancedProduction()).level);
        const oreQuantityBefore = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.ORE);
        const upgradePrice = toLowBN(await buildingInstance.getUpgradePrice(buildingLevelBefore.plus(1).toNumber()));
        expect(oreQuantityBefore).gte(upgradePrice);

        const expectedBuildingLevel = buildingLevelBefore.plus(1);
        const expectedAdvancedProductionLevel = advancedProductionLevelBefore.plus(1);
        const buildingCoefficientAfter = await BuildingHelper.getBuildingCoefficient(expectedBuildingLevel);
        const buildingCoefficientMultiplier = buildingCoefficientAfter.minus(buildingCoefficientBefore);
        const expectedTreasuryCap = toLowBN(await buildingInstance.getMaxTreasuryByLevel(expectedBuildingLevel.toNumber()));
        const expectedOreQuantity = oreQuantityBefore.minus(upgradePrice);

        const tokenAddress = await epochInstance.resources(ResourceType.ORE);
        const tokenInstance = IERC20__factory.connect(tokenAddress, signer);
        await tokenInstance.approve(testUser1, transferableFromLowBN(upgradePrice)).then((tx) => tx.wait());

        //advanced upgrade
        await buildingInstance.startAdvancedUpgrade(testUser2).then(tx => tx.wait());

        const workerCapacityCoefficient = toLowBN(await registryInstance.getWorkerCapacityCoefficient(buildingType));
        const actualBuildingLevel = toBN(await buildingInstance.getBuildingLevel());
        const actualAdvancedProductionLevel = toBN((await buildingInstance.advancedProduction()).level);
        const actualWorkersCap = toLowBN(await buildingInstance.getMaxWorkers());
        const actualTreasuryCap = toLowBN(await buildingInstance.getMaxTreasuryByLevel(actualBuildingLevel.toNumber()));
        const actualOreQuantity = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.ORE);

        expect(actualBuildingLevel).eql(expectedBuildingLevel, 'Building level after upgrade is not correct');
        expect(actualAdvancedProductionLevel).eql(expectedAdvancedProductionLevel, 'Advanced production level is not correct');
        expect(actualWorkersCap).eql(workerCapacityCoefficient.multipliedBy(buildingCoefficientMultiplier), 'Workers cap after upgrade is not correct');
        expect(actualTreasuryCap).eql(expectedTreasuryCap, 'Treasury cap after upgrade is not correct');
        expect(actualOreQuantity).isInCloseRangeWith(expectedOreQuantity);
    }

    public static async fortBasicUpgradeTest(startLevel: number) {
        const {testUser1} = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const fort = await SettlementHelper.getFort(userSettlementInstance);

        const fortHealthBefore = toLowBN(await fort.health());
        expect(fortHealthBefore).eql(new BigNumber(4));

        await BuildingHelper.upgradeBuildingToSpecifiedLevel(fort, startLevel, false);

        const buildingLevelBefore = toBN(await fort.getBuildingLevel());
        const basicProductionLevelBefore = toBN((await fort.basicProduction()).level);
        const woodQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WOOD);
        const upgradePrice = toLowBN(await fort.getUpgradePrice(startLevel));
        expect(woodQuantityBefore).gte(upgradePrice);

        const expectedBuildingLevel = buildingLevelBefore.plus(1);
        const expectedBasicProductionLevel = basicProductionLevelBefore.plus(1);
        const buildingCoefficient = await BuildingHelper.getBuildingCoefficient(expectedBuildingLevel);
        const expectedWoodQuantity = woodQuantityBefore.minus(upgradePrice);
        const expectedMaxHealth = buildingCoefficient.multipliedBy(buildingCoefficient).multipliedBy(2);

        //basic upgrade
        await fort.startBasicUpgrade(ethers.constants.AddressZero.toString()).then(tx => tx.wait());

        const actualBuildingLevel = toBN(await fort.getBuildingLevel());
        const actualBasicProductionLevel = toBN((await fort.basicProduction()).level);
        const actualWoodQuantity = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WOOD);
        const actualMaxHealth = toLowBN(await fort.getMaxHealthOnLevel(actualBuildingLevel.toNumber()));

        expect(actualBuildingLevel).eql(expectedBuildingLevel, 'Fort level after upgrade is not correct');
        expect(actualBasicProductionLevel).eql(expectedBasicProductionLevel, 'Basic production level is not correct');
        expect(actualWoodQuantity).isInCloseRangeWith(expectedWoodQuantity);
        expect(actualMaxHealth).eql(new BigNumber(expectedMaxHealth), 'Fort max health is not correct');
    }

    public static async fortAdvancedUpgradeTest(startLevel: number) {
        const {testUser1} = await getNamedAccounts();

        const registryInstance = await WorldHelper.getRegistryInstance();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const fort = await SettlementHelper.getFort(userSettlementInstance);

        const fortHealthBefore = toLowBN(await fort.health());
        expect(fortHealthBefore).eql(new BigNumber(4));

        const buildingCoefficientBefore = await BuildingHelper.getBuildingCoefficient(new BigNumber(1));

        await BuildingHelper.upgradeBuildingToSpecifiedLevel(fort, startLevel, true);

        const buildingLevelBefore = toBN(await fort.getBuildingLevel());
        const advancedProductionLevelBefore = toBN((await fort.advancedProduction()).level);
        const oreQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.ORE);
        const upgradePrice = toLowBN(await fort.getUpgradePrice(startLevel));
        expect(oreQuantityBefore).gte(upgradePrice);

        const expectedBuildingLevel = buildingLevelBefore.plus(1);
        const expectedAdvancedProductionLevel = advancedProductionLevelBefore.plus(1);
        const buildingCoefficientAfter = await BuildingHelper.getBuildingCoefficient(expectedBuildingLevel);
        const buildingCoefficientMultiplier = buildingCoefficientAfter.minus(buildingCoefficientBefore);
        const expectedOreQuantity = oreQuantityBefore.minus(upgradePrice);
        const expectedMaxHealth = buildingCoefficientAfter.multipliedBy(buildingCoefficientAfter).multipliedBy(2);

        //advanced upgrade
        await fort.startAdvancedUpgrade(ethers.constants.AddressZero.toString()).then(tx => tx.wait());

        const workerCapacityCoefficient = toLowBN(await registryInstance.getWorkerCapacityCoefficient(BuildingType.FORT));
        const actualBuildingLevel = toBN(await fort.getBuildingLevel());
        const actualAdvancedProductionLevel = toBN((await fort.advancedProduction()).level);
        const actualWorkersCap = toLowBN(await fort.getMaxWorkers());
        const actualOreQuantity = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.ORE);
        const actualMaxHealth = toLowBN(await fort.getMaxHealthOnLevel(actualBuildingLevel.toNumber()));

        expect(actualBuildingLevel).eql(expectedBuildingLevel, 'Fort level after upgrade is not correct');
        expect(actualAdvancedProductionLevel).eql(expectedAdvancedProductionLevel, 'Advanced production level is not correct');
        expect(actualWorkersCap).eql(workerCapacityCoefficient.multipliedBy(buildingCoefficientMultiplier), 'Workers cap after upgrade is not correct');
        expect(actualOreQuantity).isInCloseRangeWith(expectedOreQuantity);
        expect(actualMaxHealth).eql(new BigNumber(expectedMaxHealth), 'Fort max health is not correct');
    }

    public static async fortBasicUpgradeByAnotherUserResourcesTest() {
        const {testUser1, testUser2} = await getNamedAccounts();
        const signer = await ethers.getSigner(testUser2);

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const fort = await SettlementHelper.getFort(userSettlementInstance);
        const epochInstance = await WorldHelper.getCurrentEpochInstance();

        const fortHealthBefore = toLowBN(await fort.health());
        expect(fortHealthBefore).eql(new BigNumber(4));

        const buildingLevelBefore = toBN(await fort.getBuildingLevel());
        const basicProductionLevelBefore = toBN((await fort.basicProduction()).level);
        const woodQuantityBefore = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.WOOD);
        const upgradePrice = toLowBN(await fort.getUpgradePrice(buildingLevelBefore.plus(1).toNumber()));
        expect(woodQuantityBefore).gte(upgradePrice);

        const expectedBuildingLevel = buildingLevelBefore.plus(1);
        const expectedBasicProductionLevel = basicProductionLevelBefore.plus(1);
        const buildingCoefficient = await BuildingHelper.getBuildingCoefficient(expectedBuildingLevel);
        const expectedWoodQuantity = woodQuantityBefore.minus(upgradePrice);
        const expectedMaxHealth = buildingCoefficient.multipliedBy(buildingCoefficient).multipliedBy(2);

        const tokenAddress = await epochInstance.resources(ResourceType.WOOD);
        const tokenInstance = IERC20__factory.connect(tokenAddress, signer);
        await tokenInstance.approve(testUser1, transferableFromLowBN(upgradePrice)).then((tx) => tx.wait());

        //basic upgrade
        await fort.startBasicUpgrade(testUser2).then(tx => tx.wait());

        const actualBuildingLevel = toBN(await fort.getBuildingLevel());
        const actualBasicProductionLevel = toBN((await fort.basicProduction()).level);
        const actualWoodQuantity = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.WOOD);
        const actualMaxHealth = toLowBN(await fort.getMaxHealthOnLevel(actualBuildingLevel.toNumber()));

        expect(actualBuildingLevel).eql(expectedBuildingLevel, 'Fort level after upgrade is not correct');
        expect(actualBasicProductionLevel).eql(expectedBasicProductionLevel, 'Basic production level is not correct');
        expect(actualWoodQuantity).isInCloseRangeWith(expectedWoodQuantity);
        expect(actualMaxHealth).eql(new BigNumber(expectedMaxHealth), 'Fort max health is not correct');
    }

    public static async fortAdvancedUpgradeByAnotherUserResourcesTest() {
        const {testUser1, testUser2} = await getNamedAccounts();
        const signer = await ethers.getSigner(testUser2);

        const registryInstance = await WorldHelper.getRegistryInstance();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const fort = await SettlementHelper.getFort(userSettlementInstance);
        const epochInstance = await WorldHelper.getCurrentEpochInstance();

        const fortHealthBefore = toLowBN(await fort.health());
        expect(fortHealthBefore).eql(new BigNumber(4));

        const buildingCoefficientBefore = await BuildingHelper.getBuildingCoefficient(new BigNumber(1));

        const buildingLevelBefore = toBN(await fort.getBuildingLevel());
        const advancedProductionLevelBefore = toBN((await fort.advancedProduction()).level);
        const oreQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.ORE);
        const upgradePrice = toLowBN(await fort.getUpgradePrice(buildingLevelBefore.plus(1).toString()));
        expect(oreQuantityBefore).gte(upgradePrice);

        const expectedBuildingLevel = buildingLevelBefore.plus(1);
        const expectedAdvancedProductionLevel = advancedProductionLevelBefore.plus(1);
        const buildingCoefficientAfter = await BuildingHelper.getBuildingCoefficient(expectedBuildingLevel);
        const buildingCoefficientMultiplier = buildingCoefficientAfter.minus(buildingCoefficientBefore);
        const expectedOreQuantity = oreQuantityBefore.minus(upgradePrice);
        const expectedMaxHealth = buildingCoefficientAfter.multipliedBy(buildingCoefficientAfter).multipliedBy(2);

        const tokenAddress = await epochInstance.resources(ResourceType.ORE);
        const tokenInstance = IERC20__factory.connect(tokenAddress, signer);
        await tokenInstance.approve(testUser1, transferableFromLowBN(upgradePrice)).then((tx) => tx.wait());

        //advanced upgrade
        await fort.startAdvancedUpgrade(testUser2).then(tx => tx.wait());

        const workerCapacityCoefficient = toLowBN(await registryInstance.getWorkerCapacityCoefficient(BuildingType.FORT));
        const actualBuildingLevel = toBN(await fort.getBuildingLevel());
        const actualAdvancedProductionLevel = toBN((await fort.advancedProduction()).level);
        const actualWorkersCap = toLowBN(await fort.getMaxWorkers());
        const actualOreQuantity = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.ORE);
        const actualMaxHealth = toLowBN(await fort.getMaxHealthOnLevel(actualBuildingLevel.toNumber()));

        expect(actualBuildingLevel).eql(expectedBuildingLevel, 'Fort level after upgrade is not correct');
        expect(actualAdvancedProductionLevel).eql(expectedAdvancedProductionLevel, 'Advanced production level is not correct');
        expect(actualWorkersCap).eql(workerCapacityCoefficient.multipliedBy(buildingCoefficientMultiplier), 'Workers cap after upgrade is not correct');
        expect(actualOreQuantity).isInCloseRangeWith(expectedOreQuantity);
        expect(actualMaxHealth).eql(new BigNumber(expectedMaxHealth), 'Fort max health is not correct');
    }

    public static async impossibleBuildingBasicUpgradeWithoutResourcesTest(buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const buildingLevelBefore = toBN(await buildingInstance.getBuildingLevel());
        const woodQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WOOD);
        const upgradePrice = toLowBN(await buildingInstance.getUpgradePrice(buildingLevelBefore.toNumber()));
        expect(woodQuantityBefore).lt(upgradePrice);

        await expect(
          buildingInstance.startBasicUpgrade(ethers.constants.AddressZero.toString()).then(tx => tx.wait())
        ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: burn amount exceeds balance'");

        const actualBuildingLevel = toBN(await buildingInstance.getBuildingLevel());
        const actualWoodQuantity = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WOOD);

        expect(actualBuildingLevel).eql(buildingLevelBefore, 'Building level after upgrade is not correct');
        expect(actualWoodQuantity).eql(woodQuantityBefore);
    }

    public static async impossibleBuildingAdvancedUpgradeWithoutResourcesTest(buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const buildingLevelBefore = toBN(await buildingInstance.getBuildingLevel());
        const oreQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.ORE);
        const upgradePrice = toLowBN(await buildingInstance.getUpgradePrice(buildingLevelBefore.toNumber()));
        expect(oreQuantityBefore).lt(upgradePrice);

        await expect(
          buildingInstance.startAdvancedUpgrade(ethers.constants.AddressZero.toString()).then(tx => tx.wait())
        ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: burn amount exceeds balance'");

        const actualBuildingLevel = toBN(await buildingInstance.getBuildingLevel());
        const actualOreQuantity = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.ORE);

        expect(actualBuildingLevel).eql(buildingLevelBefore, 'Building level after upgrade is not correct');
        expect(actualOreQuantity).eql(oreQuantityBefore);
    }

    public static async impossibleBuildingUpgradeDuringCooldownTest(buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const buildingLevelBefore = toBN(await buildingInstance.getBuildingLevel());
        const woodQuantityBefore = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WOOD);
        const upgradePrice = toLowBN(await buildingInstance.getUpgradePrice(buildingLevelBefore.toNumber()));
        expect(woodQuantityBefore).gte(upgradePrice);

        await buildingInstance.startBasicUpgrade(ethers.constants.AddressZero.toString()).then(tx => tx.wait());

        await expect(
          buildingInstance.startBasicUpgrade(ethers.constants.AddressZero.toString()).then(tx => tx.wait())
        ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'already upgrading'");
    }

    public static async impossibleBuildingBasicUpgradeByAnotherUserResourcesWithoutApproveTest(buildingType: BuildingType) {
        const {testUser1, testUser2} = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const buildingLevelBefore = toBN(await buildingInstance.getBuildingLevel());
        const woodQuantityBefore = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.WOOD);
        const upgradePrice = toLowBN(await buildingInstance.getUpgradePrice(buildingLevelBefore.plus(1).toNumber()));
        expect(woodQuantityBefore).gte(upgradePrice);

        await expect(
          buildingInstance.startBasicUpgrade(testUser2).then(tx => tx.wait())
        ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: insufficient allowance'");
    }

    public static async impossibleBuildingAdvancedUpgradeByAnotherUserResourcesWithoutApproveTest(buildingType: BuildingType) {
        const {testUser1, testUser2} = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        const buildingLevelBefore = toBN(await buildingInstance.getBuildingLevel());
        const oreQuantityBefore = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.ORE);
        const upgradePrice = toLowBN(await buildingInstance.getUpgradePrice(buildingLevelBefore.plus(1).toNumber()));
        expect(oreQuantityBefore).gte(upgradePrice);

        await expect(
          buildingInstance.startAdvancedUpgrade(testUser2).then(tx => tx.wait())
        ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: insufficient allowance'");
    }
}
