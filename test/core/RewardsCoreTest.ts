import { ethers, getNamedAccounts } from "hardhat";
import { expect } from "chai";
import { toBN, toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import { ResourceHelper } from "../helpers/ResourceHelper";
import BigNumber from "bignumber.js";
import {
  Banners__factory,
  IERC20__factory,
  RewardPool__factory,
  SettlementsMarket__factory,
  Zone__factory
} from "../../typechain-types";
import { getPosition } from "../utils/position";
import { ResourceType } from "../enums/resourceType";
import { UserHelper } from "../helpers/UserHelper";
import { SettlementHelper } from "../helpers/SettlementHelper";
import { UnitType } from "../enums/unitType";
import { DEFAULT_BANNER_PARTS } from "../constants/banners";
import { TokenUtils } from "../helpers/TokenUtils";
import { UnitHelper } from "../helpers/UnitHelper";
import { WorldHelper } from "../helpers/WorldHelper";

export class RewardsCoreTest {
  public static async rewardsExchangeTest(){
    const { testUser1 } = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser1);

    const positionX = 32754;
    const positionY = 32763;
    const bannerName = 'test';
    const exchangeWeapons = 100;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const epochInstance = await WorldHelper.getCurrentEpochInstance();

    const zoneAddress = await epochInstance.zones(2);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer);

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, signer);

    const rewardPoolAddress = await worldInstance.rewardPool();
    const rewardPoolInstance = RewardPool__factory.connect(rewardPoolAddress, signer);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer);

    const blessTokenAddress = await worldInstance.blessToken();

    const userTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const rewardPoolBalance = await TokenUtils.getTokenBalance(blessTokenAddress, rewardPoolAddress);

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

    const userTokenBalanceAfterPurchase = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const rewardPoolBalanceAfterPurchase = await TokenUtils.getTokenBalance(blessTokenAddress, rewardPoolAddress);

    expect(userTokenBalanceAfterPurchase).isInCloseRangeWith(userTokenBalance.minus(settlementCost));
    expect(rewardPoolBalanceAfterPurchase).isInCloseRangeWith(rewardPoolBalance.plus(settlementCost));

    const userResourceBalance = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    const exchangeRatio = toBN(await rewardPoolInstance.ratio());

    const expectedUserResourceBalance = userResourceBalance.minus(exchangeWeapons);
    const expectedUserTokenBalance = userTokenBalanceAfterPurchase.plus((new BigNumber(exchangeWeapons).dividedBy(exchangeRatio)));
    const expectedRewardPoolBalance = rewardPoolBalanceAfterPurchase.minus((new BigNumber(exchangeWeapons).dividedBy(exchangeRatio)));

    //weapon exchange
    await rewardPoolInstance.swapWeaponsForTokens(
      ethers.constants.AddressZero.toString(),
      transferableFromLowBN(new BigNumber(exchangeWeapons))
    ).then((tx) => tx.wait());

    const actualUserResourceBalance = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    const actualUserTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const actualRewardPoolBalance = await TokenUtils.getTokenBalance(blessTokenAddress, rewardPoolAddress);

    expect(actualUserResourceBalance).eql(expectedUserResourceBalance, 'User resource balance is not correct');
    expect(actualUserTokenBalance).isInCloseRangeWith(expectedUserTokenBalance);
    expect(actualRewardPoolBalance).eql(expectedRewardPoolBalance, 'Reward pool balance is not correct');
  }

  public static async rewardsExchangeByAnotherUserResourcesTest(){
    const { testUser1, testUser2 } = await getNamedAccounts();
    const signer1 = await ethers.getSigner(testUser1);
    const signer2 = await ethers.getSigner(testUser2);

    const positionX = 32754;
    const positionY = 32763;
    const bannerName = 'test';
    const exchangeWeapons = 100;

    const worldInstance = await WorldHelper.getWorldInstance();

    const epochInstance = await WorldHelper.getCurrentEpochInstance();

    const zoneAddress = await epochInstance.zones(2);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer1);

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, signer1);

    const rewardPoolAddress = await worldInstance.rewardPool();
    const rewardPoolInstance = RewardPool__factory.connect(rewardPoolAddress, signer1);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer1);

    const blessTokenAddress = await worldInstance.blessToken();

    const userTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const rewardPoolBalance = await TokenUtils.getTokenBalance(blessTokenAddress, rewardPoolAddress);

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

    const userTokenBalanceAfterPurchase = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const rewardPoolBalanceAfterPurchase = await TokenUtils.getTokenBalance(blessTokenAddress, rewardPoolAddress);

    expect(userTokenBalanceAfterPurchase).isInCloseRangeWith(userTokenBalance.minus(settlementCost));
    expect(rewardPoolBalanceAfterPurchase).isInCloseRangeWith(rewardPoolBalance.plus(settlementCost));

    const userResourceBalance = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.WEAPON);
    const exchangeRatio = toBN(await rewardPoolInstance.ratio());

    const expectedUserResourceBalance = userResourceBalance.minus(exchangeWeapons);
    const expectedUserTokenBalance = userTokenBalanceAfterPurchase.plus((new BigNumber(exchangeWeapons).dividedBy(exchangeRatio)));
    const expectedRewardPoolBalance = rewardPoolBalanceAfterPurchase.minus((new BigNumber(exchangeWeapons).dividedBy(exchangeRatio)));

    const tokenAddress = await epochInstance.resources(ResourceType.WEAPON);
    const tokenInstance = IERC20__factory.connect(tokenAddress, signer2);
    await tokenInstance.approve(testUser1, transferableFromLowBN(new BigNumber(exchangeWeapons))).then((tx) => tx.wait());

    //weapon exchange
    await rewardPoolInstance.swapWeaponsForTokens(
      testUser2,
      transferableFromLowBN(new BigNumber(exchangeWeapons))
    ).then((tx) => tx.wait());

    const actualUserResourceBalance = await ResourceHelper.getResourceQuantity(testUser2, ResourceType.WEAPON);
    const actualUserTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const actualRewardPoolBalance = await TokenUtils.getTokenBalance(blessTokenAddress, rewardPoolAddress);

    expect(actualUserResourceBalance).eql(expectedUserResourceBalance, 'User resource balance is not correct');
    expect(actualUserTokenBalance).isInCloseRangeWith(expectedUserTokenBalance);
    expect(actualRewardPoolBalance).eql(expectedRewardPoolBalance, 'Reward pool balance is not correct');
  }

  public static async impossibleRewardsExchangeByAnotherUserResourcesWithoutApproveTest(){
    const { testUser1, testUser2 } = await getNamedAccounts();
    const signer = await ethers.getSigner(testUser1);

    const positionX = 32754;
    const positionY = 32763;
    const bannerName = 'test';
    const exchangeWeapons = 100;

    const worldInstance = await WorldHelper.getWorldInstance();

    const epochInstance = await WorldHelper.getCurrentEpochInstance();

    const zoneAddress = await epochInstance.zones(2);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer);

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, signer);

    const rewardPoolAddress = await worldInstance.rewardPool();
    const rewardPoolInstance = RewardPool__factory.connect(rewardPoolAddress, signer);

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, signer);

    const blessTokenAddress = await worldInstance.blessToken();

    const userTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const rewardPoolBalance = await TokenUtils.getTokenBalance(blessTokenAddress, rewardPoolAddress);

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

    const userTokenBalanceAfterPurchase = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const rewardPoolBalanceAfterPurchase = await TokenUtils.getTokenBalance(blessTokenAddress, rewardPoolAddress);

    expect(userTokenBalanceAfterPurchase).isInCloseRangeWith(userTokenBalance.minus(settlementCost));
    expect(rewardPoolBalanceAfterPurchase).isInCloseRangeWith(rewardPoolBalance.plus(settlementCost));

    await expect(
      rewardPoolInstance.swapWeaponsForTokens(
        testUser2,
        transferableFromLowBN(new BigNumber(exchangeWeapons))
      ).then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: insufficient allowance'");
  }

  public static async impossibleActionsAfterGameClosedTest(){
    const { testUser1 } = await getNamedAccounts();

    const unitQuantity = 1;
    const maxWeaponQuantity = 1000;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const buildingInstance = await SettlementHelper.getFort(userSettlementInstance);

    const rewardPoolAddress = await worldInstance.rewardPool();
    const rewardPoolInstance = RewardPool__factory.connect(rewardPoolAddress, userSettlementInstance.signer);

    const blessTokenAddress = await worldInstance.blessToken();

    const userResourceBalance = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    const userTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const rewardPoolBalance = await TokenUtils.getTokenBalance(blessTokenAddress, rewardPoolAddress);

    const exchangeRatio = toBN(await rewardPoolInstance.ratio());
    const exchangeWeapons = rewardPoolBalance.multipliedBy(exchangeRatio);

    const expectedUserResourceBalance = userResourceBalance.minus(exchangeWeapons);
    const expectedUserTokenBalance = userTokenBalance.plus((new BigNumber(exchangeWeapons).dividedBy(exchangeRatio)));
    const expectedRewardPoolBalance = rewardPoolBalance.minus((new BigNumber(exchangeWeapons).dividedBy(exchangeRatio)));

    //weapon exchange
    await rewardPoolInstance.swapWeaponsForTokens(
      ethers.constants.AddressZero.toString(),
      transferableFromLowBN(new BigNumber(exchangeWeapons))
    ).then((tx) => tx.wait());

    const actualUserResourceBalance = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    const actualUserTokenBalance = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const actualRewardPoolBalance = await TokenUtils.getTokenBalance(blessTokenAddress, rewardPoolAddress);

    expect(actualUserResourceBalance).eql(expectedUserResourceBalance, 'User resource balance is not correct');
    expect(actualUserTokenBalance).isInCloseRangeWith(expectedUserTokenBalance);
    expect(actualRewardPoolBalance).eql(expectedRewardPoolBalance, 'Reward pool balance is not correct');

    await expect(
      rewardPoolInstance.swapWeaponsForTokens(ethers.constants.AddressZero.toString(), transferableFromLowBN(new BigNumber(1))).then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Address: insufficient balance'");

    const actualUserResourceBalanceAfterImpossibleExchange = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    const actualUserTokenBalanceAfterImpossibleExchange = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const actualRewardPoolBalanceAfterImpossibleExchange = await TokenUtils.getTokenBalance(blessTokenAddress, rewardPoolAddress);

    expect(actualUserResourceBalanceAfterImpossibleExchange).eql(actualUserResourceBalance, 'User resource balance is not correct');
    expect(actualUserTokenBalanceAfterImpossibleExchange).eql(actualUserTokenBalance, 'User token balance is not correct');
    expect(actualRewardPoolBalanceAfterImpossibleExchange).eql(actualRewardPoolBalance, 'Reward pool balance is not correct');

    const buildingLevelBeforeUpgrade = toBN(await buildingInstance.getBuildingLevel());
    const userResourceBalanceBeforeUpgrade = await ResourceHelper.getResourcesQuantity(testUser1, [ResourceType.FOOD, ResourceType.WOOD, ResourceType.ORE]);

    await expect(
      buildingInstance.startAdvancedUpgrade(ethers.constants.AddressZero.toString())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'game closed'");

    const buildingLevelAfterImpossibleUpgrade = toBN(await buildingInstance.getBuildingLevel());
    const userResourceBalanceAfterImpossibleUpgrade = await ResourceHelper.getResourcesQuantity(testUser1, [ResourceType.FOOD, ResourceType.WOOD, ResourceType.ORE]);

    expect(buildingLevelAfterImpossibleUpgrade).eql(buildingLevelBeforeUpgrade, 'Building level is not correct');
    expect(userResourceBalanceAfterImpossibleUpgrade).eql(userResourceBalanceBeforeUpgrade, 'User resource balance is not correct');

    const army = await SettlementHelper.getArmy(userSettlementInstance);

    await expect(
      UnitHelper.hireUnits(army, [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN], unitQuantity, maxWeaponQuantity)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'game closed'");

    const actualUserResourceBalanceAfterImpossibleHire = await ResourceHelper.getResourceQuantity(testUser1, ResourceType.WEAPON);
    expect(actualUserResourceBalanceAfterImpossibleHire).eql(actualUserResourceBalance, 'User resource balance is not correct');
  }
}
