import { Settlement } from "../../typechain-types";
import { EvmUtils } from "./EvmUtils";
import { BuildingType } from "../enums/buildingType";
import { SettlementHelper } from "./SettlementHelper";
import BigNumber from "bignumber.js";
import { ethers } from "hardhat";

export class BuildingHelper {
  public static async getSettlementBuildingInstanceByType(settlementInstance: Settlement, buildingType: BuildingType) {
    switch (buildingType) {
      case BuildingType.FARM:
        return await SettlementHelper.getFarm(settlementInstance);
      case BuildingType.LUMBERMILL:
        return await SettlementHelper.getLumbermill(settlementInstance);
      case BuildingType.MINE:
        return await SettlementHelper.getMine(settlementInstance);
      case BuildingType.SMITHY:
        return await SettlementHelper.getSmithy(settlementInstance);
      case BuildingType.FORT:
        return await SettlementHelper.getFort(settlementInstance);
      default:
        throw new Error('Wrong building type');
    }
  }

  public static async upgradeBuildingToSpecifiedLevel(buildingInstance: any, buildingLevel: number, isAdvanced: boolean) {
    for (let i = 2; i < buildingLevel; i++) {
      if (isAdvanced) {
        await buildingInstance.startAdvancedUpgrade(ethers.constants.AddressZero.toString()).then(tx => tx.wait());
      } else {
        const upgradeCooldown = await buildingInstance.getBasicUpgradeCooldownDuration(buildingLevel);
        await buildingInstance.startBasicUpgrade(ethers.constants.AddressZero.toString()).then(tx => tx.wait());
        await EvmUtils.increaseTime(upgradeCooldown.toNumber());
      }

      await buildingInstance.distributeToAllShareholders().then(tx => tx.wait());
    }
  }

  public static async getBuildingCoefficient(buildingLevel: BigNumber) {
    const increaseByEveryNLevels = new BigNumber(5);
    const b = buildingLevel.dividedBy(increaseByEveryNLevels).integerValue(BigNumber.ROUND_FLOOR);
    const c = buildingLevel.minus(b.multipliedBy(increaseByEveryNLevels));
    const d = increaseByEveryNLevels.multipliedBy(((b.plus(1).multipliedBy(b)).dividedBy(2)).integerValue(BigNumber.ROUND_FLOOR));
    return d.plus(c.multipliedBy(b.plus(1)));
  }
}