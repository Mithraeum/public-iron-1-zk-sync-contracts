import { IERC1155__factory, Settlement } from "../../typechain-types";
import { toBN } from "../../scripts/utils/const";
import { BuildingType } from "../enums/buildingType";
import { BuildingHelper } from "./BuildingHelper";
import { WorldHelper } from "./WorldHelper";

export class SharesHelper {
  public static async getShareAmount(
    settlementInstance: Settlement,
    userName: string,
    buildingType: BuildingType
  ) {
    const worldInstance = await WorldHelper.getWorldInstance(userName);

    const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(settlementInstance, buildingType);
    const sharesAddress = await worldInstance.distributions();
    const sharesInstance = IERC1155__factory.connect(sharesAddress, settlementInstance.signer);
    const buildingDistributionId = await buildingInstance.distributionId();

    return toBN(await sharesInstance.balanceOf(userName, buildingDistributionId));
  }

  public static async getSharesAmount(settlementInstance: Settlement, address: string, buildingTypes: BuildingType[]) {
    return Object.fromEntries(await Promise.all(buildingTypes.map(async buildingType => {
      return [buildingType, await SharesHelper.getShareAmount(settlementInstance, address, buildingType)];
    })));
  }
}
