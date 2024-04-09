import { IERC1155__factory } from "../../typechain-types";
import BigNumber from "bignumber.js";
import { getNamedAccounts } from "hardhat";
import { UserHelper } from "../helpers/UserHelper";
import { expect } from "chai";
import { SharesHelper } from "../helpers/SharesHelper";
import { ResourceHelper } from "../helpers/ResourceHelper";
import { ProductionHelper } from "../helpers/ProductionHelper";
import { BuildingType } from "../enums/buildingType";
import { BuildingHelper } from "../helpers/BuildingHelper";
import { WorldHelper } from "../helpers/WorldHelper";

export class SharesCoreTest {
  public static async sendSharesAndHarvestTest(buildingType: BuildingType, sharesAmount: number) {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const investResourceQuantity = 50;
    const investWorkerQuantity = 3;
    const productionTime = 100;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

    const sharesAddress = await worldInstance.distributions();
    const sharesInstance = IERC1155__factory.connect(sharesAddress, userSettlementInstance.signer);
    const buildingDistributionId = await buildingInstance.distributionId();

    const productionConfig = await buildingInstance.getConfig();
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    const producingResourceName = producingResourceConfig!.resourceName;
    expect(producingResourceConfig).to.exist;

    const sharesBalanceBefore1 = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    const sharesBalanceBefore2 = await SharesHelper.getShareAmount(userSettlementInstance, testUser2, buildingType);

    expect(sharesBalanceBefore1).eql(new BigNumber(100), 'Shares amount is not correct');
    expect(sharesBalanceBefore2).eql(new BigNumber(0), 'Shares amount is not correct');

    await ProductionHelper.produceResourcesForSpecifiedDuration(userSettlementInstance, buildingType, investResourceQuantity, investWorkerQuantity, productionTime);

    const resourceQuantityBefore1 = await ResourceHelper.getResourceQuantity(testUser1, producingResourceName);
    const resourceQuantityBefore2 = await ResourceHelper.getResourceQuantity(testUser2, producingResourceName);

    await sharesInstance.safeTransferFrom(testUser1, testUser2, buildingDistributionId, sharesAmount, '0x').then(tx => tx.wait());

    const sharesBalanceAfter1 = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    const sharesBalanceAfter2 = await SharesHelper.getShareAmount(userSettlementInstance, testUser2, buildingType);

    expect(sharesBalanceAfter1).eql(sharesBalanceBefore1.minus(sharesAmount), 'Shares amount is not correct');
    expect(sharesBalanceAfter2).eql(sharesBalanceBefore2.plus(sharesAmount), 'Shares amount is not correct');

    await ProductionHelper.produceResourcesForSpecifiedDuration(userSettlementInstance, buildingType, investResourceQuantity, investWorkerQuantity, productionTime);

    const resourceQuantityAfter1 = await ResourceHelper.getResourceQuantity(testUser1, producingResourceName);
    const resourceQuantityAfter2 = await ResourceHelper.getResourceQuantity(testUser2, producingResourceName);

    const producedResourceQuantity1 = resourceQuantityAfter1.minus(resourceQuantityBefore1);
    const producedResourceQuantity2 = resourceQuantityAfter2.minus(resourceQuantityBefore2);

    expect(producedResourceQuantity1.dividedBy(producedResourceQuantity2)).isInCloseRangeWith(new BigNumber(100 - sharesAmount).dividedBy(sharesAmount));
  }

  public static async impossibleSendSharesMoreThanMaxCapTest(buildingType: BuildingType) {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const sharesAmount = 110;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

    const sharesAddress = await worldInstance.distributions();
    const sharesInstance = IERC1155__factory.connect(sharesAddress, userSettlementInstance.signer);
    const buildingDistributionId = await buildingInstance.distributionId();

    const productionConfig = await buildingInstance.getConfig();
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const sharesBalanceBefore1 = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    const sharesBalanceBefore2 = await SharesHelper.getShareAmount(userSettlementInstance, testUser2, buildingType);

    expect(sharesBalanceBefore1).eql(new BigNumber(100), 'Shares amount is not correct');
    expect(sharesBalanceBefore2).eql(new BigNumber(0), 'Shares amount is not correct');

    await expect(
      sharesInstance.safeTransferFrom(testUser1, testUser2, buildingDistributionId, sharesAmount, '0x').then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC1155: insufficient balance for transfer'");
  }

  public static async returnSharesTest(buildingType: BuildingType, sharesAmount: number) {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const investResourceQuantity = 5;
    const investWorkerQuantity = 2;
    const productionTime = 10;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

    const sharesAddress = await worldInstance.distributions();
    const sharesInstance = IERC1155__factory.connect(sharesAddress, userSettlementInstance.signer);
    const buildingDistributionIdBefore = await buildingInstance.distributionId();

    const productionConfig = await buildingInstance.getConfig();
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const sharesBalanceBefore1 = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    const sharesBalanceBefore2 = await SharesHelper.getShareAmount(userSettlementInstance, testUser2, buildingType);

    expect(sharesBalanceBefore1).eql(new BigNumber(100), 'Shares amount is not correct');
    expect(sharesBalanceBefore2).eql(new BigNumber(0), 'Shares amount is not correct');

    await sharesInstance.safeTransferFrom(testUser1, testUser2, buildingDistributionIdBefore, sharesAmount, '0x').then(tx => tx.wait());

    const sharesBalanceAfter1 = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    const sharesBalanceAfter2 = await SharesHelper.getShareAmount(userSettlementInstance, testUser2, buildingType);

    expect(sharesBalanceAfter1).eql(sharesBalanceBefore1.minus(sharesAmount), 'Shares amount is not correct');
    expect(sharesBalanceAfter2).eql(sharesBalanceBefore2.plus(sharesAmount), 'Shares amount is not correct');

    await ProductionHelper.produceResourcesForSpecifiedDuration(userSettlementInstance, buildingType, investResourceQuantity, investWorkerQuantity, productionTime);
    await buildingInstance.resetDistribution().then(tx => tx.wait());

    const buildingDistributionIdAfter = await buildingInstance.distributionId();
    const actualSharesBalance1 = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    const actualSharesBalance2 = await SharesHelper.getShareAmount(userSettlementInstance, testUser2, buildingType);

    expect(buildingDistributionIdAfter).gt(buildingDistributionIdBefore, 'Building distribution id is not correct');
    expect(actualSharesBalance1).eql(sharesBalanceBefore1, 'Shares amount is not correct');
    expect(actualSharesBalance2).eql(sharesBalanceBefore2, 'Shares amount is not correct');
  }

  public static async impossibleReturnSharesDueHighTreasuryAmountTest(buildingType: BuildingType, sharesAmount: number) {
    const { testUser1, testUser2 } = await getNamedAccounts();

    const investResourceQuantity = 10;
    const investWorkerQuantity = 3;
    const productionTime = 100000;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

    const sharesAddress = await worldInstance.distributions();
    const sharesInstance = IERC1155__factory.connect(sharesAddress, userSettlementInstance.signer);
    const buildingDistributionIdBefore = await buildingInstance.distributionId();

    const productionConfig = await buildingInstance.getConfig();
    const producingResourceConfig = productionConfig.find((config) => config.isProducing);
    expect(producingResourceConfig).to.exist;

    const sharesBalanceBefore1 = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    const sharesBalanceBefore2 = await SharesHelper.getShareAmount(userSettlementInstance, testUser2, buildingType);

    expect(sharesBalanceBefore1).eql(new BigNumber(100), 'Shares amount is not correct');
    expect(sharesBalanceBefore2).eql(new BigNumber(0), 'Shares amount is not correct');

    await sharesInstance.safeTransferFrom(testUser1, testUser2, buildingDistributionIdBefore, sharesAmount, '0x').then(tx => tx.wait());

    const sharesBalanceAfter1 = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    const sharesBalanceAfter2 = await SharesHelper.getShareAmount(userSettlementInstance, testUser2, buildingType);

    expect(sharesBalanceAfter1).eql(sharesBalanceBefore1.minus(sharesAmount), 'Shares amount is not correct');
    expect(sharesBalanceAfter2).eql(sharesBalanceBefore2.plus(sharesAmount), 'Shares amount is not correct');

    await ProductionHelper.produceResourcesForSpecifiedDuration(userSettlementInstance, buildingType, investResourceQuantity, investWorkerQuantity, productionTime);

    await expect(
      buildingInstance.resetDistribution().then(tx => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Token recall not allowed'");
  }
}
