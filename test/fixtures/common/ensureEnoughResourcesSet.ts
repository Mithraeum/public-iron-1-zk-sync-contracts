import { UserHelper } from "../../helpers/UserHelper";
import { WorldHelper } from "../../helpers/WorldHelper";
import { transferableFromLowBN } from "../../../scripts/utils/const";
import BigNumber from "bignumber.js";

export const ensureEnoughResourcesSet = async function (
  userAddress: string,
  settlementNumber: number
) {
  const userSettlementInstance = await UserHelper.getUserSettlementByNumber(userAddress, settlementNumber);

  const settlersAmount = 100;
  const resourcesAmount = 5000000;

  await WorldHelper.mintWorkers(
    transferableFromLowBN(new BigNumber(settlersAmount)),
    userSettlementInstance.address
  );

  const resources = await WorldHelper.getResources();

  for (let i = 0; i < resources.length; i++) {
    await WorldHelper.mintResource(
      resources[i],
      transferableFromLowBN(new BigNumber(resourcesAmount)),
      userAddress
    );
  }

  console.log(`Resources minted to ${userAddress} and its settlement № ${settlementNumber}`);
}