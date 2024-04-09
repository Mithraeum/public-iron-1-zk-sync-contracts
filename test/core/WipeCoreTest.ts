import { deployments, ethers, getNamedAccounts } from "hardhat";
import {
  Banners__factory,
  CultistsSettlement__factory,
  Epoch__factory,
  EpochView__factory,
  RewardPool__factory,
  SettlementsMarket__factory,
  Units__factory,
  Zone__factory
} from "../../typechain-types";
import { UserHelper } from "../helpers/UserHelper";
import { toBN, toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import BigNumber from "bignumber.js";
import { EvmUtils } from "../helpers/EvmUtils";
import { expect } from "chai";
import { WorldHelper } from "../helpers/WorldHelper";
import { ResourceHelper } from "../helpers/ResourceHelper";
import { ResourceType } from "../enums/resourceType";
import { TokenUtils } from "../helpers/TokenUtils";
import { ProductionHelper } from "../helpers/ProductionHelper";
import { getPosition } from "../utils/position";
import { DEFAULT_BANNER_PARTS } from "../constants/banners";
import { ensureEnoughResourcesSet } from "../fixtures/common/ensureEnoughResourcesSet";
import { SettlementHelper } from "../helpers/SettlementHelper";

export class WipeCoreTest {
  public static async worldWipeDueCultistsMaxCapTest() {
    const {testUser1, testUser2, testUser3} = await getNamedAccounts();

    const toxicityAmount = 50000;
    const zones = 5;
    const exchangeWeapons = 100;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();
    const blessTokenAddress = await worldInstance.blessToken();

    const userSettlementInstance1 = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const userSettlementInstance2 = await UserHelper.getUserSettlementByNumber(testUser2, 1);
    const userSettlementInstance3 = await UserHelper.getUserSettlementByNumber(testUser3, 1);

    const rewardPoolAddress = await worldInstance.rewardPool();
    const rewardPoolInstance = RewardPool__factory.connect(rewardPoolAddress, userSettlementInstance1.signer);

    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const epochNumberBefore = await WorldHelper.getCurrentEpochNumber();

    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance1, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance2, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance3, toxicityAmount);

    //cultists summon
    const summonDelay = toBN(await registryInstance.getCultistsSummonDelay());
    await EvmUtils.increaseTime(summonDelay.toNumber());

    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance1);
    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance2);
    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance3);

    const perZoneMultiplier = toLowBN(await registryInstance.getCultistsPerZoneMultiplier());
    const totalSummonedCultists = toLowBN(await epochInstance.totalCultists());
    expect(totalSummonedCultists).gte(perZoneMultiplier.multipliedBy(zones));

    const resourceTypes = [ResourceType.FOOD, ResourceType.WOOD, ResourceType.ORE, ResourceType.WEAPON];
    const resourcesBefore1 = await ResourceHelper.getResourcesQuantity(testUser1, resourceTypes);
    const resourcesBefore2 = await ResourceHelper.getResourcesQuantity(testUser2, resourceTypes);
    const resourcesBefore3 = await ResourceHelper.getResourcesQuantity(testUser3, resourceTypes);

    for (let i = 0; i < resourceTypes.length; i++) {
      expect(resourcesBefore1[resourceTypes[i]]).not.to.eql(new BigNumber(0));
      expect(resourcesBefore2[resourceTypes[i]]).not.to.eql(new BigNumber(0));
      expect(resourcesBefore3[resourceTypes[i]]).not.to.eql(new BigNumber(0));
    }

    //exchange before wipe
    const userTokenBalanceBeforeSwapDuringFirstEpoch = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    await rewardPoolInstance.swapWeaponsForTokens(ethers.constants.AddressZero.toString(), transferableFromLowBN(new BigNumber(exchangeWeapons))).then((tx) => tx.wait());
    const userTokenBalanceAfterSwapDuringFirstEpoch = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const userTokenBalanceBySwapDuringFirstEpoch = userTokenBalanceAfterSwapDuringFirstEpoch.minus(userTokenBalanceBeforeSwapDuringFirstEpoch);

    const destructionTime = (await registryInstance.getCultistsNoDestructionDelay()).toNumber();
    await EvmUtils.increaseTime(destructionTime);
    await worldInstance.destroyCurrentEpoch().then((tx) => tx.wait());

    const resourcesAfter1 = await ResourceHelper.getResourcesQuantity(testUser1, resourceTypes);
    const resourcesAfter2 = await ResourceHelper.getResourcesQuantity(testUser2, resourceTypes);
    const resourcesAfter3 = await ResourceHelper.getResourcesQuantity(testUser3, resourceTypes);

    for (let i = 0; i < resourceTypes.length; i++) {
      expect(resourcesAfter1[resourceTypes[i]]).eql(new BigNumber(0));
      expect(resourcesAfter2[resourceTypes[i]]).eql(new BigNumber(0));
      expect(resourcesAfter3[resourceTypes[i]]).eql(new BigNumber(0));
    }

    const epochNumberAfter = await WorldHelper.getCurrentEpochNumber();
    expect(toBN(epochNumberAfter)).eql(toBN(epochNumberBefore).plus(1));

    const resources = await WorldHelper.getResources();
    console.log(resources);

    //resource mint
    for (let i = 0; i < resources.length; i++) {
      await WorldHelper.mintResource(
        resources[i],
        transferableFromLowBN(new BigNumber(exchangeWeapons)),
        testUser1
      );
    }

    //exchange after wipe
    const userTokenBalanceBeforeSwapDuringSecondEpoch = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    await rewardPoolInstance.swapWeaponsForTokens(ethers.constants.AddressZero.toString(), transferableFromLowBN(new BigNumber(exchangeWeapons))).then((tx) => tx.wait());
    const userTokenBalanceAfterSwapDuringSecondEpoch = await TokenUtils.getTokenBalance(blessTokenAddress, testUser1);
    const userTokenBalanceBySwapDuringSecondEpoch = userTokenBalanceAfterSwapDuringSecondEpoch.minus(userTokenBalanceBeforeSwapDuringSecondEpoch);

    expect(userTokenBalanceBySwapDuringSecondEpoch).isInCloseRangeWith(userTokenBalanceBySwapDuringFirstEpoch.multipliedBy(2));
  }

  public static async impossibleWorldWipeDueCultistsMaxCapTest() {
    const {testUser1, testUser2, testUser3} = await getNamedAccounts();

    const toxicityAmount = 100;
    const zones = 5;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance1 = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const userSettlementInstance2 = await UserHelper.getUserSettlementByNumber(testUser2, 1);
    const userSettlementInstance3 = await UserHelper.getUserSettlementByNumber(testUser3, 1);

    const epochInstance = await WorldHelper.getCurrentEpochInstance();

    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance1, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance2, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance3, toxicityAmount);

    //cultists summon
    const summonDelay = toBN(await registryInstance.getCultistsSummonDelay());
    await EvmUtils.increaseTime(summonDelay.toNumber());

    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance1);
    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance2);
    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance3);

    const perZoneMultiplier = toLowBN(await registryInstance.getCultistsPerZoneMultiplier());
    const totalSummonedCultists = toLowBN(await epochInstance.totalCultists());
    expect(totalSummonedCultists).lt(perZoneMultiplier.multipliedBy(zones));

    const destructionTime = (await registryInstance.getCultistsNoDestructionDelay()).toNumber();
    await EvmUtils.increaseTime(destructionTime);

    await expect(
      worldInstance.destroyCurrentEpoch().then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'cultists limit not reached'");
  }

  public static async impossibleWorldWipeDuringDestructionDelayTest() {
    const {testUser1, testUser2, testUser3} = await getNamedAccounts();

    const toxicityAmount = 50000;
    const zones = 5;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance1 = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const userSettlementInstance2 = await UserHelper.getUserSettlementByNumber(testUser2, 1);
    const userSettlementInstance3 = await UserHelper.getUserSettlementByNumber(testUser3, 1);

    const epochInstance = await WorldHelper.getCurrentEpochInstance();

    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance1, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance2, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance3, toxicityAmount);

    //cultists summon
    const summonDelay = toBN(await registryInstance.getCultistsSummonDelay());
    await EvmUtils.increaseTime(summonDelay.toNumber());

    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance1);
    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance2);
    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance3);

    const perZoneMultiplier = toLowBN(await registryInstance.getCultistsPerZoneMultiplier());
    const totalSummonedCultists = toLowBN(await epochInstance.totalCultists());
    expect(totalSummonedCultists).gte(perZoneMultiplier.multipliedBy(zones));

    const resourceTypes = [ResourceType.FOOD, ResourceType.WOOD, ResourceType.ORE, ResourceType.WEAPON];
    const resourcesBefore1 = await ResourceHelper.getResourcesQuantity(testUser1, resourceTypes);
    const resourcesBefore2 = await ResourceHelper.getResourcesQuantity(testUser2, resourceTypes);
    const resourcesBefore3 = await ResourceHelper.getResourcesQuantity(testUser3, resourceTypes);

    for (let i = 0; i < resourceTypes.length; i++) {
      expect(resourcesBefore1[resourceTypes[i]]).not.to.eql(new BigNumber(0));
      expect(resourcesBefore2[resourceTypes[i]]).not.to.eql(new BigNumber(0));
      expect(resourcesBefore3[resourceTypes[i]]).not.to.eql(new BigNumber(0));
    }

    await expect(
      worldInstance.destroyCurrentEpoch().then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'destruction not available yet'");
  }

  public static async cultistSummonTest() {
    const { testUser1 } = await getNamedAccounts();

    const toxicityAmount = 10000;

    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const zoneAddress = await userSettlementInstance.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance.signer);
    const epochInstance = await WorldHelper.getCurrentEpochInstance();

    const cultistsSettlementAddress = await zoneInstance.cultistsSettlement();
    const cultistsSettlementInstance = CultistsSettlement__factory.connect(cultistsSettlementAddress, userSettlementInstance.signer);

    const cultistsArmyAddress = await cultistsSettlementInstance.army();

    const cultistUnitName = await registryInstance.getCultistUnitType();
    const cultistUnitAddress = await epochInstance.units(cultistUnitName);
    const cultistUnitInstance = Units__factory.connect(cultistUnitAddress, userSettlementInstance.signer);

    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance, toxicityAmount);

    const zoneToxicity = toLowBN(await zoneInstance.toxicity());

    const cultistUnitAmountBefore = toLowBN(await cultistUnitInstance.balanceOf(cultistsArmyAddress));
    expect(cultistUnitAmountBefore).eql(new BigNumber(0), 'Cultists Quantity is not correct');

    //cultists summon
    const summonDelay = toBN(await registryInstance.getCultistsSummonDelay());
    await EvmUtils.increaseTime(summonDelay.toNumber());
    await zoneInstance.summonCultists().then((tx) => tx.wait());

    const cultistUnitAmountAfter = toLowBN(await cultistUnitInstance.balanceOf(cultistsArmyAddress));
    expect(cultistUnitAmountAfter).gt(new BigNumber(0), 'Cultists Quantity is not correct');

    const expectedSummonedCultists = ((zoneToxicity.dividedBy(10)).minus(cultistUnitAmountBefore.dividedBy(2))).integerValue(BigNumber.ROUND_FLOOR);
    const actualSummonedCultists = cultistUnitAmountAfter.minus(cultistUnitAmountBefore);
    expect(actualSummonedCultists).eql(expectedSummonedCultists, 'Cultists Quantity is not correct');
  }

  public static async impossibleCultistSummonDuringSummonDelayTest() {
    const { testUser1 } = await getNamedAccounts();

    const toxicityAmount = 100;

    const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);

    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance, toxicityAmount);

    await expect(
      WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance)
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'summon delay'");
  }

  public static async settlementCostAfterWipeTest() {
    const { testUser1, testUser2, testUser3, testUser4 } = await getNamedAccounts();
    const signer1 = await ethers.getSigner(testUser1);
    const signer2 = await ethers.getSigner(testUser2);
    const signer3 = await ethers.getSigner(testUser3);
    const signer4 = await ethers.getSigner(testUser4);

    const bannerName = 'testBanner';
    const toxicityAmount = 50000;
    const zones = 5;

    const worldInstance = await WorldHelper.getWorldInstance(testUser4);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const epochNumberBefore = await worldInstance.currentEpochNumber();
    const epochAddressBefore = await worldInstance.epochs(epochNumberBefore);
    const epochInstanceBefore = Epoch__factory.connect(epochAddressBefore, signer4);

    const zoneAddress = await epochInstanceBefore.zones(2);
    const zoneInstance = Zone__factory.connect(zoneAddress, signer4);

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, signer4);

    const zoneAddress1 = await epochInstanceBefore.zones(1);
    const zoneInstance1 = Zone__factory.connect(zoneAddress1, signer1);

    const zoneAddress2 = await epochInstanceBefore.zones(3);
    const zoneInstance2 = Zone__factory.connect(zoneAddress2, signer2);

    const zoneAddress3 = await epochInstanceBefore.zones(4);
    const zoneInstance3 = Zone__factory.connect(zoneAddress3, signer3);

    const bannersAddress = await worldInstance.bannerContract();
    const blessTokenAddress = await worldInstance.blessToken();

    await SettlementHelper.createSettlement(zoneInstance1, getPosition(32756, 32773), bannerName, bannersAddress, blessTokenAddress);
    await SettlementHelper.createSettlement(zoneInstance2, getPosition(32745, 32745), bannerName, bannersAddress, blessTokenAddress);
    await SettlementHelper.createSettlement(zoneInstance3, getPosition(32779, 32762), bannerName, bannersAddress, blessTokenAddress);

    await ensureEnoughResourcesSet(testUser1, 1);
    await ensureEnoughResourcesSet(testUser2, 1);
    await ensureEnoughResourcesSet(testUser3, 1);

    const userSettlementInstance1 = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const userSettlementInstance2 = await UserHelper.getUserSettlementByNumber(testUser2, 1);
    const userSettlementInstance3 = await UserHelper.getUserSettlementByNumber(testUser3, 1);

    const settlementCostBefore = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance1, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance2, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance3, toxicityAmount);

    //cultists summon
    const summonDelay = toBN(await registryInstance.getCultistsSummonDelay());
    await EvmUtils.increaseTime(summonDelay.toNumber());

    await zoneInstance1.summonCultists().then((tx) => tx.wait());
    await zoneInstance2.summonCultists().then((tx) => tx.wait());
    await zoneInstance3.summonCultists().then((tx) => tx.wait());

    const perZoneMultiplier = toLowBN(await registryInstance.getCultistsPerZoneMultiplier());
    const totalSummonedCultists = toLowBN(await epochInstanceBefore.totalCultists());
    expect(totalSummonedCultists).gte(perZoneMultiplier.multipliedBy(zones));

    const destructionTime = (await registryInstance.getCultistsNoDestructionDelay()).toNumber();
    await EvmUtils.increaseTime(destructionTime);

    const settlementCostAfter = toLowBN(await settlementsMarketInstance.getNewSettlementCost());
    expect(settlementCostAfter).lt(settlementCostBefore);

    await worldInstance.destroyCurrentEpoch().then((tx) => tx.wait());

    const epochNumberAfter = await WorldHelper.getCurrentEpochNumber();
    expect(toBN(epochNumberAfter)).eql(toBN(epochNumberBefore).plus(1));

    const epochAddressAfter = await worldInstance.epochs(epochNumberAfter);
    const epochInstanceAfter = Epoch__factory.connect(epochAddressAfter, signer4);
    await epochInstanceAfter.activateZone(2);

    const zoneAddressAfter = await epochInstanceAfter.zones(2);
    const zoneInstanceAfter = Zone__factory.connect(zoneAddressAfter, signer4);

    const settlementsMarketAddressAfter = await zoneInstanceAfter.settlementsMarket();
    const settlementsMarketInstanceAfter = SettlementsMarket__factory.connect(settlementsMarketAddressAfter, signer4);

    const actualSettlementCost = toLowBN(await settlementsMarketInstanceAfter.getNewSettlementCost());
    expect(actualSettlementCost).isInCloseRangeWith(settlementCostAfter);
  }

  public static async settlementRestoreWithZoneActivationAfterWipeTest() {
    const {testUser1, testUser2, testUser3} = await getNamedAccounts();

    const toxicityAmount = 50000;
    const zones = 5;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance1 = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const userSettlementInstance2 = await UserHelper.getUserSettlementByNumber(testUser2, 1);
    const userSettlementInstance3 = await UserHelper.getUserSettlementByNumber(testUser3, 1);

    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const epochNumberBefore = await WorldHelper.getCurrentEpochNumber();

    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance1, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance2, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance3, toxicityAmount);

    //cultists summon
    const summonDelay = toBN(await registryInstance.getCultistsSummonDelay());
    await EvmUtils.increaseTime(summonDelay.toNumber());

    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance1);
    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance2);
    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance3);

    const perZoneMultiplier = toLowBN(await registryInstance.getCultistsPerZoneMultiplier());
    const totalSummonedCultists = toLowBN(await epochInstance.totalCultists());
    expect(totalSummonedCultists).gte(perZoneMultiplier.multipliedBy(zones));

    const destructionTime = (await registryInstance.getCultistsNoDestructionDelay()).toNumber();
    await EvmUtils.increaseTime(destructionTime);

    const settlementEpochBefore = await userSettlementInstance1.epochNumber();
    expect(toBN(settlementEpochBefore)).eql(toBN(epochNumberBefore));

    await worldInstance.destroyCurrentEpoch().then((tx) => tx.wait());

    const epochNumberAfter = await WorldHelper.getCurrentEpochNumber();
    expect(toBN(epochNumberAfter)).eql(toBN(epochNumberBefore).plus(1));

    const epochAddressAfter = await worldInstance.epochs(epochNumberAfter);

    const epochViewAddress = (await deployments.get('EpochView')).address;
    const epochViewInstance = EpochView__factory.connect(epochViewAddress, userSettlementInstance1.signer);

    await epochViewInstance.restoreSettlementWithZoneActivation(epochAddressAfter, getPosition(32757, 32757));

    const userSettlementInstance1After = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const settlementEpochAfter = await userSettlementInstance1After.epochNumber();
    expect(toBN(settlementEpochAfter)).eql(toBN(epochNumberAfter));
  }

  public static async impossibleSettlementPurchaseAfterWipeTest(){
    const {testUser1, testUser2, testUser3} = await getNamedAccounts();

    const toxicityAmount = 50000;
    const zones = 5;

    const worldInstance = await WorldHelper.getWorldInstance(testUser1);
    const registryInstance = await WorldHelper.getRegistryInstance();

    const userSettlementInstance1 = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const userSettlementInstance2 = await UserHelper.getUserSettlementByNumber(testUser2, 1);
    const userSettlementInstance3 = await UserHelper.getUserSettlementByNumber(testUser3, 1);

    const zoneAddress = await userSettlementInstance1.currentZone();
    const zoneInstance = Zone__factory.connect(zoneAddress, userSettlementInstance1.signer);

    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const epochNumberBefore = await WorldHelper.getCurrentEpochNumber();

    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance1, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance2, toxicityAmount);
    await ProductionHelper.increaseToxicityBySettlement(userSettlementInstance3, toxicityAmount);

    //cultists summon
    const summonDelay = toBN(await registryInstance.getCultistsSummonDelay());
    await EvmUtils.increaseTime(summonDelay.toNumber());

    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance1);
    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance2);
    await WorldHelper.summonCultistsInCurrentSettlementZone(userSettlementInstance3);

    const perZoneMultiplier = toLowBN(await registryInstance.getCultistsPerZoneMultiplier());
    const totalSummonedCultists = toLowBN(await epochInstance.totalCultists());
    expect(totalSummonedCultists).gte(perZoneMultiplier.multipliedBy(zones));

    const destructionTime = (await registryInstance.getCultistsNoDestructionDelay()).toNumber();
    await EvmUtils.increaseTime(destructionTime);

    const settlementEpochBefore = await userSettlementInstance1.epochNumber();
    expect(toBN(settlementEpochBefore)).eql(toBN(epochNumberBefore));

    await worldInstance.destroyCurrentEpoch().then((tx) => tx.wait());

    const epochNumberAfter = await WorldHelper.getCurrentEpochNumber();
    expect(toBN(epochNumberAfter)).eql(toBN(epochNumberBefore).plus(1));

    const settlementsMarketAddress = await zoneInstance.settlementsMarket();
    const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, userSettlementInstance1.signer);

    const blessTokenAddress = await worldInstance.blessToken();

    const bannersAddress = await worldInstance.bannerContract();
    const bannersInstance = Banners__factory.connect(bannersAddress, userSettlementInstance1.signer);

    //banner mint
    await bannersInstance.mint('bannerName', DEFAULT_BANNER_PARTS, "0x").then((tx) => tx.wait());

    const userBanners = await bannersInstance.getBannerDataByUserBatch(testUser1);
    const lastBannerIndex = userBanners.tokenIds.length - 1;

    const settlementCost = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

    await expect(
      settlementsMarketInstance
        .buySettlement(
          getPosition(32757, 32760),
          userBanners.tokenIds[lastBannerIndex].toString(),
          ethers.constants.MaxUint256.toString(),
          blessTokenAddress === ethers.constants.AddressZero
            ? {value: transferableFromLowBN(settlementCost)}
            : {}
        )
        .then((tx) => tx.wait())
    ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'settlement can be placed only in active epoch'");
  }
}
