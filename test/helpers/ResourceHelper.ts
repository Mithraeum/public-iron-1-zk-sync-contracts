import { ethers } from "hardhat";
import {
  Resource__factory, Settlement,
  Workers__factory
} from "../../typechain-types";
import { toLowBN } from "../../scripts/utils/const";
import { WorldHelper } from "./WorldHelper";
import { ResourceType } from "../enums/resourceType";

export class ResourceHelper {
  public static async getResourceQuantity(
    userName: string,
    resourceName: string
  ) {
    const signer = await ethers.getSigner(userName);
    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const resourceAddress = await epochInstance.resources(resourceName);
    const resourceInstance = Resource__factory.connect(resourceAddress, signer);

    return toLowBN(await resourceInstance.balanceOf(userName));
  }

  public static async getResourcesQuantity(address: string, resourceTypes: ResourceType[]) {
    return Object.fromEntries(await Promise.all(resourceTypes.map(async resourceType => {
      return [resourceType, await ResourceHelper.getResourceQuantity(address, resourceType)];
    })));
  }

  public static async getResourceStateBalanceOf(
    userName: string,
    resourceName: ResourceType
  ) {
    const signer = await ethers.getSigner(userName);
    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const resourceAddress = await epochInstance.resources(resourceName);
    const resourceInstance = Resource__factory.connect(resourceAddress, signer);

    return toLowBN(await resourceInstance.stateBalanceOf(userName));
  }

  public static async getResourcesStateBalanceOf(address: string, resourceTypes: ResourceType[]) {
    return Object.fromEntries(await Promise.all(resourceTypes.map(async resourceType => {
      return [resourceType, await ResourceHelper.getResourceStateBalanceOf(address, resourceType)];
    })));
  }

  public static async getUnassignedWorkersQuantity(
    settlementInstance: Settlement
  ) {
    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const workerAddress = await epochInstance.workers();
    const workerInstance = Workers__factory.connect(workerAddress, settlementInstance.signer);

    return toLowBN(await workerInstance.balanceOf(settlementInstance.address));
  }
}
