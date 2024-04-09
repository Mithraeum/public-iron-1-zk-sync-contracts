import {
  Banners__factory,
  Epoch__factory,
  SettlementsMarket__factory, StubBlessToken__factory,
  World__factory,
  Zone__factory
} from "../../../typechain-types";
import { DEFAULT_BANNER_PARTS } from "../../constants/banners";
import { toLowBN, transferableFromLowBN } from "../../../scripts/utils/const";
import { ethers } from "hardhat";
import BigNumber from "bignumber.js";
import { EvmUtils } from "../../helpers/EvmUtils";
import { getPosition } from "../../utils/position";

export const ensureSettlementCreated = async function (
  worldDeployerAddress: string,
  userAddress: string,
  worldAddress: string,
  name: string,
  zoneId: number,
  position: {x: number; y: number}
) {
  const userSigner = await ethers.getSigner(userAddress);
  const worldProxyInstance = World__factory.connect(worldAddress, userSigner);

  //0. mint bless tokens to the user
  const worldDeployerSigner = await ethers.getSigner(worldDeployerAddress);
  const blessTokenAddress = await worldProxyInstance.blessToken();
  console.log(`blessTokenAddress ${blessTokenAddress}`);

  //1. create banner
  const bannersAddress = await worldProxyInstance.bannerContract();
  const bannersInstance = Banners__factory.connect(bannersAddress, userSigner);

  await bannersInstance.mint(name, DEFAULT_BANNER_PARTS, "0x").then((tx) => tx.wait());
  console.log(`Banner ${name} created`);

  const userBanners = await bannersInstance.getBannerDataByUserBatch(userAddress);

  //2. get zone 0 settlement market address
  const currentEpochNumber = await worldProxyInstance.currentEpochNumber();
  const currentEpochAddress = await worldProxyInstance.epochs(currentEpochNumber);
  const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, userSigner);
  const zoneAddress = await currentEpochInstance.zones(zoneId);
  const zoneInstance = Zone__factory.connect(zoneAddress, userSigner);
  const settlementsMarketAddress = await zoneInstance.settlementsMarket();
  const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, userSigner);

  const settlementCost = toLowBN(await settlementsMarketInstance.getNewSettlementCost());

  if (blessTokenAddress !== ethers.constants.AddressZero) {
    const worldBlessTokenInstance = StubBlessToken__factory.connect(blessTokenAddress, worldDeployerSigner);
    await worldBlessTokenInstance
      .mintTo(userAddress, transferableFromLowBN(new BigNumber(settlementCost)))
      .then((tx) => tx.wait());

    const userBlessTokenInstance = StubBlessToken__factory.connect(blessTokenAddress, userSigner);
    await userBlessTokenInstance
      .approve(settlementsMarketAddress, transferableFromLowBN(new BigNumber(settlementCost)))
      .then((tx) => tx.wait());
    console.log(`Increased allowance for ${settlementsMarketAddress}, allowance=${settlementCost.toString(10)}`);
  } else {
    await EvmUtils.increaseBalance(userAddress, new BigNumber(settlementCost));
  }

  //3. on settlement create use created banner index
  const lastBannerIndex = userBanners.tokenIds.length - 1;
  await settlementsMarketInstance
    .buySettlement(
      getPosition(position.x, position.y),
      userBanners.tokenIds[lastBannerIndex].toString(),
      ethers.constants.MaxUint256.toString(),
      blessTokenAddress === ethers.constants.AddressZero
        ? {value: transferableFromLowBN(settlementCost)}
        : {}
    )
    .then((tx) => tx.wait());

  console.log(`Settlement for ${userAddress} created`);
};
