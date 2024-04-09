import { ethers, getNamedAccounts } from "hardhat";
import {
  Banners__factory,
  Epoch__factory, Registry__factory,
  SettlementsMarket__factory, StubBlessToken__factory,
  Zone__factory
} from "../../typechain-types";
import { toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import { getPosition } from "../utils/position";
import BigNumber from "bignumber.js";
import { expect } from "chai";
import { EvmUtils } from "../helpers/EvmUtils";
import { DEFAULT_BANNER_PARTS } from "../constants/banners";
import { TokenUtils } from "../helpers/TokenUtils";
import { WorldHelper } from "../helpers/WorldHelper";
import { ONE_DAY_IN_SECONDS, ONE_HOUR_IN_SECONDS } from "../constants/time";

export class SettlementCoreTest {
  public static async settlementPurchaseWithPriceDropTest() {
    const { testUser1 } = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser1);

    const bannerName = 'test';
    const positionX = 32757;
    const positionY = 32757;
    const priceDropTime = 10;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const currentEpochNumber = await worldInstance.currentEpochNumber();
    const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);
    const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, signer);

    const zoneAddress = await currentEpochInstance.zones(2);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer);

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, signer);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer);

    const blessTokenAddress = await worldInstance.blessToken();

    //banner mint
    await bannersInstance.mint(bannerName, DEFAULT_BANNER_PARTS, "0x").then((tx) => tx.wait());
    await zoneInstance.updateState().then((tx) => tx.wait());

    const userBanners = await bannersInstance.getBannerDataByUserBatch(testUser1);

    //price drop before settlement purchase
    const [settlementCostBeforeFirstDrop, timeBeforeFirstDrop] = await Promise.all([
      toLowBN(await settlementsMarketInstance.getNewSettlementCost()),
      EvmUtils.getCurrentTime()
    ]);

    await EvmUtils.increaseTime(priceDropTime);

    const [actualSettlementCostAfterFirstDrop, timeAfterFirstDrop] = await Promise.all([
      toLowBN(await settlementsMarketInstance.getNewSettlementCost()),
      EvmUtils.getCurrentTime()
    ]);

    const timePassedDuringFirstDrop = timeAfterFirstDrop - timeBeforeFirstDrop;
    let expectedSettlementCostAfterFirstDrop = settlementCostBeforeFirstDrop;
    for (let i = 0; i < timePassedDuringFirstDrop; i++) {
      expectedSettlementCostAfterFirstDrop = expectedSettlementCostAfterFirstDrop.minus(
        (expectedSettlementCostAfterFirstDrop.multipliedBy(0.75).dividedBy(ONE_HOUR_IN_SECONDS)));
    }

    expect(actualSettlementCostAfterFirstDrop).isInCloseRangeWith(expectedSettlementCostAfterFirstDrop);

    const lastBannerIndex = userBanners.tokenIds.length - 1;

    //settlement purchase
    const tokenBalanceBefore = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const settlementCost = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

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

    const expectedTokenBalance = tokenBalanceBefore.minus(settlementCost);

    const actualTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    expect(actualTokenBalance).isInCloseRangeWith(expectedTokenBalance);

    //price drop after settlement purchase
    const [settlementCostBeforeSecondDrop, timeBeforeSecondDrop] = await Promise.all([
      toLowBN(await settlementsMarketInstance.getNewSettlementCost()),
      EvmUtils.getCurrentTime()
    ]);

    await EvmUtils.increaseTime(priceDropTime);

    const [actualSettlementCostAfterSecondDrop, timeAfterSecondDrop] = await Promise.all([
      toLowBN(await settlementsMarketInstance.getNewSettlementCost()),
      EvmUtils.getCurrentTime()
    ]);

    const timePassedDuringSecondDrop = timeAfterSecondDrop - timeBeforeSecondDrop;
    let expectedSettlementCostAfterSecondDrop = settlementCostBeforeSecondDrop;
    for (let i = 0; i < timePassedDuringSecondDrop; i++) {
      expectedSettlementCostAfterSecondDrop = expectedSettlementCostAfterSecondDrop.minus(
        ((expectedSettlementCostAfterSecondDrop.multipliedBy(0.75).dividedBy(ONE_HOUR_IN_SECONDS)).multipliedBy(0.7)));
    }

    expect(actualSettlementCostAfterSecondDrop).isInCloseRangeWith(expectedSettlementCostAfterSecondDrop);
  }

  public static async impossibleSettlementPurchaseNotInAcceptableRadiusTest() {
    const { testUser1 } = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser1);

    const bannerName = 'test';
    const positionX = 32756;
    const positionY = 32757;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const currentEpochNumber = await worldInstance.currentEpochNumber();
    const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);
    const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, signer);

    const zoneAddress = await currentEpochInstance.zones(2);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer);

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, signer);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer);

    const blessTokenAddress = await worldInstance.blessToken();

    await bannersInstance.mint(bannerName, DEFAULT_BANNER_PARTS, "0x").then((tx) => tx.wait());
    await zoneInstance.updateState().then((tx) => tx.wait());

    const userBanners = await bannersInstance.getBannerDataByUserBatch(testUser1);

    const lastBannerIndex = userBanners.tokenIds.length - 1;

    const tokenBalanceBefore = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const settlementCostBefore = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    await expect(
      settlementsMarketInstance
        .buySettlement(
          getPosition(positionX, positionY),
          userBanners.tokenIds[lastBannerIndex].toString(),
          ethers.constants.MaxUint256.toString(),
          blessTokenAddress === ethers.constants.AddressZero
            ? {value: transferableFromLowBN(settlementCostBefore)}
            : {}
        )
        .then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'settlement in radius 2'");

    const actualTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const actualSettlementCost = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    expect(actualTokenBalance).eql(tokenBalanceBefore, 'Token balance is not correct');
    expect(actualSettlementCost).eql(settlementCostBefore, 'Settlement cost is not correct');
  }

  public static async impossibleSettlementPurchaseWithoutMoneyTest() {
    const { worldDeployer, testUser1 } = await getNamedAccounts();
    const worldDeployerSigner = await ethers.getSigner(worldDeployer);
    const signer = await ethers.getSigner(testUser1);

    const bannerName = 'test';
    const positionX = 32757;
    const positionY = 32757;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const currentEpochNumber = await worldInstance.currentEpochNumber();
    const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);
    const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, signer);

    const zoneAddress = await currentEpochInstance.zones(2);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer);

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, signer);

    const registryAddress = await worldInstance.registry();
    const registryInstance = Registry__factory.connect(registryAddress, signer);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer);

    const blessTokenAddress = await worldInstance.blessToken();

    const tokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const settlementStartingPrice = toLowBN(await registryInstance.getNewSettlementStartingPrice());

    //tokens burn
    if (blessTokenAddress !== ethers.constants.AddressZero) {
      const worldBlessTokenInstance = StubBlessToken__factory.connect(blessTokenAddress, worldDeployerSigner);
      await worldBlessTokenInstance
        .burnFrom(testUser1, transferableFromLowBN(tokenBalance.minus(settlementStartingPrice.dividedBy(2))))
        .then((tx) => tx.wait());

      const userBlessTokenInstance = StubBlessToken__factory.connect(blessTokenAddress, signer);
      await userBlessTokenInstance
        .approve(settlementsMarketAddress, transferableFromLowBN(new BigNumber(settlementStartingPrice)))
        .then((tx) => tx.wait());
    } else {
      await EvmUtils.decreaseBalance(testUser1, tokenBalance.minus(settlementStartingPrice.dividedBy(2)));
    }

    //banner mint
    await bannersInstance.mint(bannerName, DEFAULT_BANNER_PARTS, "0x").then((tx) => tx.wait());
    await zoneInstance.updateState().then((tx) => tx.wait());

    const userBanners = await bannersInstance.getBannerDataByUserBatch(testUser1);

    const lastBannerIndex = userBanners.tokenIds.length - 1;

    const tokenBalanceBefore = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const settlementCostBefore = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    try {
      await settlementsMarketInstance
        .buySettlement(
          getPosition(positionX, positionY),
          userBanners.tokenIds[lastBannerIndex].toString(),
          ethers.constants.MaxUint256.toString(),
          blessTokenAddress === ethers.constants.AddressZero
            ? {value: transferableFromLowBN(settlementCostBefore)}
            : {}
        )
        .then((tx) => tx.wait());
    }
    catch (err: any) {
      expect(err.message).to.have.string("sender doesn't have enough funds to send tx");
    }

    const actualTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const actualSettlementCost = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    expect(actualTokenBalance).eql(tokenBalanceBefore, 'Token balance is not correct');
    expect(actualSettlementCost).eql(settlementCostBefore, 'Settlement cost is not correct');
  }

  public static async impossibleSettlementPurchaseWithLowMaxTokenToUseTest() {
    const { testUser1 } = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser1);

    const bannerName = 'test';
    const positionX = 32757;
    const positionY = 32757;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const currentEpochNumber = await worldInstance.currentEpochNumber();
    const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);
    const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, signer);

    const zoneAddress = await currentEpochInstance.zones(2);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer);

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, signer);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer);

    const blessTokenAddress = await worldInstance.blessToken();

    //banner mint
    await bannersInstance.mint(bannerName, DEFAULT_BANNER_PARTS, "0x").then((tx) => tx.wait());
    await zoneInstance.updateState().then((tx) => tx.wait());

    const userBanners = await bannersInstance.getBannerDataByUserBatch(testUser1);

    const lastBannerIndex = userBanners.tokenIds.length - 1;

    const tokenBalanceBefore = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const settlementCostBefore = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    await expect(
      settlementsMarketInstance
        .buySettlement(
          getPosition(positionX, positionY),
          userBanners.tokenIds[lastBannerIndex].toString(),
          transferableFromLowBN(settlementCostBefore.minus(1)),
          blessTokenAddress === ethers.constants.AddressZero
            ? {value: transferableFromLowBN(settlementCostBefore)}
            : {}
        )
        .then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'maxTokensToUse < newSettlementCost'");

    const actualTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const actualSettlementCost = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    expect(actualTokenBalance).eql(tokenBalanceBefore, 'Token balance is not correct');
    expect(actualSettlementCost).eql(settlementCostBefore, 'Settlement cost is not correct');
  }

  public static async impossibleSettlementPurchaseWithFullZoneTest() {
    const { testUser1 } = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser1);

    const bannerName = 'test';
    const positionX = 32745;
    const positionY = 32758;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const currentEpochNumber = await worldInstance.currentEpochNumber();
    const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);
    const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, signer);

    const zoneAddress = await currentEpochInstance.zones(2);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer);

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, signer);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer);

    const blessTokenAddress = await worldInstance.blessToken();

    //banner mint
    await bannersInstance.mint(bannerName, DEFAULT_BANNER_PARTS, "0x").then((tx) => tx.wait());
    await zoneInstance.updateState().then((tx) => tx.wait());

    const userBanners = await bannersInstance.getBannerDataByUserBatch(testUser1);
    const lastBannerIndex = userBanners.tokenIds.length - 1;

    const tokenBalanceBefore = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const settlementCostBefore = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    await expect(
      settlementsMarketInstance
        .buySettlement(
          getPosition(positionX, positionY),
          userBanners.tokenIds[lastBannerIndex].toString(),
          ethers.constants.MaxUint256.toString(),
          blessTokenAddress === ethers.constants.AddressZero
            ? {value: transferableFromLowBN(settlementCostBefore)}
            : {}
        )
        .then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'exceed max settlements per zone'");

    const actualTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const actualSettlementCost = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    expect(actualTokenBalance).eql(tokenBalanceBefore, 'Token balance is not correct');
    expect(actualSettlementCost).eql(settlementCostBefore, 'Settlement cost is not correct');
  }

  public static async settlementPurchaseInDifferentZoneTest() {
    const { testUser1 } = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser1);

    const bannerName = 'test';
    const position = 2146926584;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const currentEpochNumber = await worldInstance.currentEpochNumber();
    const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);
    const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, signer);

    const zoneAddress = await currentEpochInstance.zones(4);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer);

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, signer);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer);

    const blessTokenAddress = await worldInstance.blessToken();

    await bannersInstance.mint(bannerName, DEFAULT_BANNER_PARTS, "0x").then((tx) => tx.wait());
    await zoneInstance.updateState().then((tx) => tx.wait());

    const userBanners = await bannersInstance.getBannerDataByUserBatch(testUser1);

    const lastBannerIndex = userBanners.tokenIds.length - 1;

    const tokenBalanceBefore = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const settlementCost = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    await settlementsMarketInstance
      .buySettlement(
        position,
        userBanners.tokenIds[lastBannerIndex].toString(),
        ethers.constants.MaxUint256.toString(),
        blessTokenAddress === ethers.constants.AddressZero
          ? {value: transferableFromLowBN(settlementCost)}
          : {}
      )
      .then((tx) => tx.wait());

    const expectedTokenBalance = tokenBalanceBefore.minus(settlementCost);
    const expectedSettlementCost = settlementCost.multipliedBy(1.3);

    const actualTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    expect(actualTokenBalance).isInCloseRangeWith(expectedTokenBalance);

    const actualSettlementCost = toLowBN(await settlementsMarketInstance.getNewSettlementCost());
    expect(actualSettlementCost).isInCloseRangeWith(expectedSettlementCost);
  }

  public static async settlementCostBeforeGameStartedTest() {
    const {testUser1} = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser1);

    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const zoneAddress = await epochInstance.zones(1);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer);
    const settlementsMarketInstance = SettlementsMarket__factory.connect(await zoneInstance.settlementsMarket(), signer);

    const settlementPrice = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    await EvmUtils.increaseTime(100);

    const settlementCostBeforeStart = toLowBN(await settlementsMarketInstance.getNewSettlementCost());
    expect(settlementCostBeforeStart).eql(settlementPrice);

    await EvmUtils.increaseTime(ONE_DAY_IN_SECONDS);

    const settlementCostAfterStart = toLowBN(await settlementsMarketInstance.getNewSettlementCost());
    expect(settlementCostAfterStart).lt(settlementCostBeforeStart);
  }
}
