import { deployments, ethers, getNamedAccounts } from "hardhat";
import {
  Banners__factory,
  IERC1155__factory, IERC20__factory,
  SettlementsListings__factory,
  World__factory
} from "../../typechain-types";
import { UserHelper } from "../helpers/UserHelper";
import { TokenUtils } from "../helpers/TokenUtils";
import { toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import BigNumber from "bignumber.js";
import { expect } from "chai";
import { SharesHelper } from "../helpers/SharesHelper";
import { WorldHelper } from "../helpers/WorldHelper";
import { TokenType } from "../enums/tokenType";
import { OrderStatus } from "../enums/orderStatus";
import { BuildingType } from "../enums/buildingType";
import { BuildingHelper } from "../helpers/BuildingHelper";

export class SettlementListingsTest {
  public static async settlementOrderWithSharesTest(tokenType: string, buildings: BuildingType[]) {
    const { testUser1, testUser2 } = await getNamedAccounts();
    const signer1 = await ethers.getSigner(testUser1);
    const signer2 = await ethers.getSigner(testUser2);

    const worldAddress = (await deployments.get('WorldProxy')).address;
    const worldInstance = World__factory.connect(worldAddress, signer1);

    const settlementsListingsAddress = (await deployments.get("SettlementsListings")).address;
    const settlementsListingsInstance1 = SettlementsListings__factory.connect(settlementsListingsAddress, signer1);
    const settlementsListingsInstance2 = SettlementsListings__factory.connect(settlementsListingsAddress, signer2);

    const settlementPrice = 30;
    const minSharesAmount = 40;

    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer1);
    const sharesAddress = await worldInstance.distributions();
    const sharesInstance = IERC1155__factory.connect(sharesAddress, signer1);

    const tokenAddress = tokenType === TokenType.BLESS
      ? await worldInstance.blessToken()
      : await epochInstance.resources(tokenType);

    const tokenBalanceBefore1 = await TokenUtils.getTokenBalance(tokenAddress, testUser1);
    const tokenBalanceBefore2 = await TokenUtils.getTokenBalance(tokenAddress, testUser2);

    const userBanner = await bannersInstance.getBannerDataByUserBatch(testUser1);
    const bannerId = userBanner.tokenIds[0];

    await settlementsListingsInstance1.createOrder(
      bannerId,
      tokenAddress,
      transferableFromLowBN(new BigNumber(settlementPrice))
    ).then((tx) => tx.wait());
    const orderId = await settlementsListingsInstance1.lastOrderId();

    const orderStatusBefore = (await settlementsListingsInstance1.orders(orderId)).status;
    expect(orderStatusBefore).eql(OrderStatus.NEW, 'Order status is not correct');

    const sharesBalanceBefore1 = await SharesHelper.getSharesAmount(userSettlementInstance, testUser1, buildings);
    const sharesBalanceBefore2 = await SharesHelper.getSharesAmount(userSettlementInstance, testUser2, buildings);

    await bannersInstance.setApprovalForAll(settlementsListingsAddress, true).then((tx) => tx.wait());
    await sharesInstance.setApprovalForAll(settlementsListingsAddress, true).then((tx) => tx.wait());

    const minBuildingsSharesToReceive = buildings.map(structure => {
      return {buildingType: structure, minSharesAmount: minSharesAmount}
    });

    if (tokenAddress !== ethers.constants.AddressZero) {
      const tokenInstance2 = IERC20__factory.connect(tokenAddress, signer2);
      await tokenInstance2.approve(settlementsListingsAddress, ethers.constants.MaxUint256).then((tx) => tx.wait());
    }

    await settlementsListingsInstance2.acceptOrder(
      orderId,
      minBuildingsSharesToReceive,
      tokenAddress === ethers.constants.AddressZero
        ? {value: transferableFromLowBN(new BigNumber(settlementPrice))}
        : {}
    ).then((tx) => tx.wait());

    const expectedTokenBalance1 = tokenBalanceBefore1.plus(settlementPrice);
    const expectedTokenBalance2 = tokenBalanceBefore2.minus(settlementPrice);

    const actualTokenBalance1 = await TokenUtils.getTokenBalance(tokenAddress, testUser1);
    const actualTokenBalance2 = await TokenUtils.getTokenBalance(tokenAddress, testUser2);
    const actualSharesBalance1 = await SharesHelper.getSharesAmount(userSettlementInstance, testUser1, buildings);
    const actualSharesBalance2 = await SharesHelper.getSharesAmount(userSettlementInstance, testUser2, buildings);

    const orderStatusAfter = (await settlementsListingsInstance2.orders(orderId)).status;
    expect(orderStatusAfter).eql(OrderStatus.ACCEPTED, 'Order status is not correct');
    expect(actualTokenBalance1).isInCloseRangeWith(expectedTokenBalance1);
    expect(actualTokenBalance2).isInCloseRangeWith(expectedTokenBalance2);

    for (let i = 0; i < buildings.length; i++) {
      expect(actualSharesBalance1[buildings[i]]).eql(sharesBalanceBefore1[buildings[i]].minus(sharesBalanceBefore1[buildings[i]]), `testUser1 shares balance is not correct`);
      expect(actualSharesBalance2[buildings[i]]).eql(sharesBalanceBefore2[buildings[i]].plus(sharesBalanceBefore1[buildings[i]]), `testUser2 shares balance is not correct`);
    }
  }

  public static async settlementOrderWithReducedSharesAmountTest() {
    const { testUser1, testUser2, testUser3 } = await getNamedAccounts();
    const signer1 = await ethers.getSigner(testUser1);
    const signer2 = await ethers.getSigner(testUser2);

    const worldAddress = (await deployments.get('WorldProxy')).address;
    const worldInstance = World__factory.connect(worldAddress, signer1);

    const settlementsListingsAddress = (await deployments.get("SettlementsListings")).address;
    const settlementsListingsInstance1 = SettlementsListings__factory.connect(settlementsListingsAddress, signer1);
    const settlementsListingsInstance2 = SettlementsListings__factory.connect(settlementsListingsAddress, signer2);

    const sharesAmount = 40;
    const buildingType = BuildingType.LUMBERMILL;
    const settlementPrice = 30;
    const maxSharesAmount = 100;
    const tokenType = TokenType.BLESS;

    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer1);
    const sharesAddress = await worldInstance.distributions();
    const sharesInstance = IERC1155__factory.connect(sharesAddress, signer1);
    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);
    const buildingDistributionId = await buildingInstance.distributionId();

    const sharesBalanceBefore1 = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    const sharesBalanceBefore2 = await SharesHelper.getShareAmount(userSettlementInstance, testUser2, buildingType);
    const sharesBalanceBefore3 = await SharesHelper.getShareAmount(userSettlementInstance, testUser3, buildingType);

    expect(sharesBalanceBefore1).eql(new BigNumber(maxSharesAmount), 'Shares amount is not correct');
    expect(sharesBalanceBefore2).eql(new BigNumber(0), 'Shares amount is not correct');
    expect(sharesBalanceBefore3).eql(new BigNumber(0), 'Shares amount is not correct');

    await sharesInstance.safeTransferFrom(testUser1, testUser3, buildingDistributionId, sharesAmount, '0x').then(tx => tx.wait());

    const sharesBalanceAfter1 = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    const sharesBalanceAfter2 = await SharesHelper.getShareAmount(userSettlementInstance, testUser2, buildingType);
    const sharesBalanceAfter3 = await SharesHelper.getShareAmount(userSettlementInstance, testUser3, buildingType);

    expect(sharesBalanceAfter1).eql(sharesBalanceBefore1.minus(sharesAmount), 'Shares amount is not correct');
    expect(sharesBalanceAfter3).eql(sharesBalanceBefore3.plus(sharesAmount), 'Shares amount is not correct');

    const tokenAddress = tokenType === TokenType.BLESS
      ? await worldInstance.blessToken()
      : await epochInstance.resources(tokenType);

    const userBanner = await bannersInstance.getBannerDataByUserBatch(testUser1);
    const bannerId = userBanner.tokenIds[0];

    await settlementsListingsInstance1.createOrder(
      bannerId,
      tokenAddress,
      transferableFromLowBN(new BigNumber(settlementPrice))
    ).then((tx) => tx.wait());
    const orderId = await settlementsListingsInstance1.lastOrderId();

    await bannersInstance.setApprovalForAll(settlementsListingsAddress, true).then((tx) => tx.wait());
    await sharesInstance.setApprovalForAll(settlementsListingsAddress, true).then((tx) => tx.wait());

    if (tokenAddress !== ethers.constants.AddressZero) {
      const tokenInstance2 = IERC20__factory.connect(tokenAddress, signer2);
      await tokenInstance2.approve(settlementsListingsAddress, ethers.constants.MaxUint256).then((tx) => tx.wait());
    }

    await settlementsListingsInstance2.acceptOrder(
      orderId,
      [{buildingType: buildingType, minSharesAmount: maxSharesAmount - sharesAmount}],
      tokenAddress === ethers.constants.AddressZero
        ? {value: transferableFromLowBN(new BigNumber(settlementPrice))}
        : {}
    ).then((tx) => tx.wait());

    const actualSharesBalance1 = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    const actualSharesBalance2 = await SharesHelper.getShareAmount(userSettlementInstance, testUser2, buildingType);

    expect(actualSharesBalance1).eql(new BigNumber(0), 'Shares amount is not correct');
    expect(actualSharesBalance2).eql(sharesBalanceAfter2.plus(sharesBalanceAfter1), 'Shares amount is not correct');
  }

  public static async impossibleSettlementOrderWithLowerSharesAmountThanWasOnOrderCreationTest() {
    const { testUser1, testUser2, testUser3 } = await getNamedAccounts();
    const signer1 = await ethers.getSigner(testUser1);
    const signer2 = await ethers.getSigner(testUser2);

    const worldAddress = (await deployments.get('WorldProxy')).address;
    const worldInstance = World__factory.connect(worldAddress, signer1);

    const settlementsListingsAddress = (await deployments.get("SettlementsListings")).address;
    const settlementsListingsInstance1 = SettlementsListings__factory.connect(settlementsListingsAddress, signer1);
    const settlementsListingsInstance2 = SettlementsListings__factory.connect(settlementsListingsAddress, signer2);

    const sharesAmount = 40;
    const buildingType = BuildingType.LUMBERMILL;
    const settlementPrice = 30;
    const maxSharesAmount = 100;
    const tokenType = TokenType.BLESS;

    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer1);
    const sharesAddress = await worldInstance.distributions();
    const sharesInstance = IERC1155__factory.connect(sharesAddress, signer1);
    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);
    const buildingDistributionId = await buildingInstance.distributionId();

    const tokenAddress = tokenType === TokenType.BLESS
      ? await worldInstance.blessToken()
      : await epochInstance.resources(tokenType);

    const userBanner = await bannersInstance.getBannerDataByUserBatch(testUser1);
    const bannerId = userBanner.tokenIds[0];

    await settlementsListingsInstance1.createOrder(
      bannerId,
      tokenAddress,
      transferableFromLowBN(new BigNumber(settlementPrice))
    ).then((tx) => tx.wait());
    const orderId = await settlementsListingsInstance1.lastOrderId();

    const sharesBalanceBefore = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    expect(sharesBalanceBefore).eql(new BigNumber(maxSharesAmount), 'Shares amount is not correct');

    await sharesInstance.safeTransferFrom(testUser1, testUser3, buildingDistributionId, sharesAmount, '0x').then(tx => tx.wait());

    const sharesBalanceAfter = await SharesHelper.getShareAmount(userSettlementInstance, testUser1, buildingType);
    expect(sharesBalanceAfter).lt(new BigNumber(maxSharesAmount), 'Shares amount is not correct');

    await bannersInstance.setApprovalForAll(settlementsListingsAddress, true).then((tx) => tx.wait());
    await sharesInstance.setApprovalForAll(settlementsListingsAddress, true).then((tx) => tx.wait());

    if (tokenAddress !== ethers.constants.AddressZero) {
      const tokenInstance2 = IERC20__factory.connect(tokenAddress, signer2);
      await tokenInstance2.approve(settlementsListingsAddress, ethers.constants.MaxUint256).then((tx) => tx.wait());
    }

    await expect(
      settlementsListingsInstance2.acceptOrder(
        orderId,
        [{buildingType: buildingType, minSharesAmount: maxSharesAmount}],
        tokenAddress === ethers.constants.AddressZero
          ? {value: transferableFromLowBN(new BigNumber(settlementPrice))}
          : {}
      ).then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'not enough shares'");
  }

  public static async impossibleSettlementOrderWithSharesMoreThanMaxCapTest() {
    const { testUser1, testUser2 } = await getNamedAccounts();
    const signer1 = await ethers.getSigner(testUser1);
    const signer2 = await ethers.getSigner(testUser2);

    const worldAddress = (await deployments.get('WorldProxy')).address;
    const worldInstance = World__factory.connect(worldAddress, signer1);

    const settlementsListingsAddress = (await deployments.get("SettlementsListings")).address;
    const settlementsListingsInstance1 = SettlementsListings__factory.connect(settlementsListingsAddress, signer1);
    const settlementsListingsInstance2 = SettlementsListings__factory.connect(settlementsListingsAddress, signer2);

    const tokenType = TokenType.BLESS;
    const settlementPrice = 30;
    const minSharesAmount = 110;
    const buildings = [BuildingType.FARM, BuildingType.LUMBERMILL, BuildingType.MINE, BuildingType.SMITHY];

    const epochInstance = await WorldHelper.getCurrentEpochInstance();

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer1);
    const sharesAddress = await worldInstance.distributions();
    const sharesInstance = IERC1155__factory.connect(sharesAddress, signer1);

    const tokenAddress = tokenType === TokenType.BLESS ?
      await worldInstance.blessToken()
      : await epochInstance.resources(tokenType);

    const userBanner = await bannersInstance.getBannerDataByUserBatch(testUser1);
    const bannerId = userBanner.tokenIds[0];

    await settlementsListingsInstance1.createOrder(
      bannerId,
      tokenAddress,
      transferableFromLowBN(new BigNumber(settlementPrice))
    ).then((tx) => tx.wait());
    const orderId = await settlementsListingsInstance1.lastOrderId();

    await bannersInstance.setApprovalForAll(settlementsListingsAddress, true).then((tx) => tx.wait());
    await sharesInstance.setApprovalForAll(settlementsListingsAddress, true).then((tx) => tx.wait());

    const minBuildingsSharesToReceive = buildings.map(building => {
      return {buildingType: building, minSharesAmount: minSharesAmount}
    });

    if (tokenAddress !== ethers.constants.AddressZero) {
      const tokenInstance2 = IERC20__factory.connect(tokenAddress, signer2);
      await tokenInstance2.approve(settlementsListingsAddress, ethers.constants.MaxUint256).then((tx) => tx.wait());
    }

    await expect(
      settlementsListingsInstance2.acceptOrder(
        orderId,
        minBuildingsSharesToReceive,
        tokenAddress === ethers.constants.AddressZero
          ? {value: transferableFromLowBN(new BigNumber(settlementPrice))}
          : {}
      ).then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'not enough shares'");
  }

  public static async cancelSettlementOrderTest() {
    const { testUser1 } = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser1);

    const worldAddress = (await deployments.get('WorldProxy')).address;
    const worldInstance = World__factory.connect(worldAddress, signer);

    const settlementsListingsAddress = (await deployments.get("SettlementsListings")).address;
    const settlementsListingsInstance = SettlementsListings__factory.connect(settlementsListingsAddress, signer);

    const settlementPrice = 30;

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer);

    const blessTokenAddress = await worldInstance.blessToken();

    const userBanner = await bannersInstance.getBannerDataByUserBatch(testUser1);
    const bannerId = userBanner.tokenIds[0];

    await settlementsListingsInstance.createOrder(
      bannerId,
      blessTokenAddress,
      transferableFromLowBN(new BigNumber(settlementPrice))
    ).then((tx) => tx.wait());
    const orderId = await settlementsListingsInstance.lastOrderId();

    const orderStatusBefore = (await settlementsListingsInstance.orders(orderId)).status;
    expect(orderStatusBefore).eql(OrderStatus.NEW, 'Order status is not correct');

    await settlementsListingsInstance.cancelOrder(orderId).then((tx) => tx.wait());

    const orderStatusAfter = (await settlementsListingsInstance.orders(orderId)).status;
    expect(orderStatusAfter).eql(OrderStatus.CANCELLED, 'Order status is not correct');
  }

  public static async modifySettlementOrderTest() {
    const { testUser1 } = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser1);

    const worldAddress = (await deployments.get('WorldProxy')).address;
    const worldInstance = World__factory.connect(worldAddress, signer);

    const settlementsListingsAddress = (await deployments.get("SettlementsListings")).address;
    const settlementsListingsInstance = SettlementsListings__factory.connect(settlementsListingsAddress, signer);

    const settlementPrice = 30;
    const newSettlementPrice = 50;

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer);

    const blessTokenAddress = await worldInstance.blessToken();

    const userBanner = await bannersInstance.getBannerDataByUserBatch(testUser1);
    const bannerId = userBanner.tokenIds[0];

    await settlementsListingsInstance.createOrder(
      bannerId,
      blessTokenAddress,
      transferableFromLowBN(new BigNumber(settlementPrice))
    ).then((tx) => tx.wait());
    const orderId = await settlementsListingsInstance.lastOrderId();

    const orderPriceBefore = toLowBN((await settlementsListingsInstance.orders(orderId)).price);
    expect(orderPriceBefore).eql(new BigNumber(settlementPrice), 'Order price is not correct');

    await settlementsListingsInstance.modifyOrder(orderId, blessTokenAddress, transferableFromLowBN(new BigNumber(newSettlementPrice))).then((tx) => tx.wait());

    const orderPriceAfter = toLowBN((await settlementsListingsInstance.orders(orderId)).price);
    expect(orderPriceAfter).eql(new BigNumber(newSettlementPrice), 'Order price is not correct');
  }
}
