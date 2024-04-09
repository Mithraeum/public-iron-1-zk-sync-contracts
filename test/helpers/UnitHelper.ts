import { ethers } from "hardhat";
import { WorldHelper } from "./WorldHelper";
import {
  Army,
  CultistsSettlement__factory,
  Settlement__factory,
  Units__factory,
  Zone,
  Zone__factory
} from "../../typechain-types";
import { toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import { UnitType } from "../enums/unitType";
import BigNumber from "bignumber.js";

export class UnitHelper {
  public static async getCultistsQuantity(
    zoneInstance: Zone
  ) {
    const registryInstance = await WorldHelper.getRegistryInstance();

    const epochInstance = await WorldHelper.getCurrentEpochInstance();

    const cultistsSettlementAddress = await zoneInstance.cultistsSettlement();
    const cultistsSettlementInstance = CultistsSettlement__factory.connect(cultistsSettlementAddress, zoneInstance.signer);
    const cultistsArmyAddress = await cultistsSettlementInstance.army();
    const cultistUnitName = await registryInstance.getCultistUnitType();
    const cultistUnitAddress = await epochInstance.units(cultistUnitName);
    const cultistUnitInstance = Units__factory.connect(cultistUnitAddress, zoneInstance.signer);

    return toLowBN(await cultistUnitInstance.balanceOf(cultistsArmyAddress));
  }

  public static async getUnitQuantity(
    userName: string,
    unitName: string
  ) {
    const signer = await ethers.getSigner(userName);
    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const unitAddress = await epochInstance.units(unitName);
    const userUnits = Units__factory.connect(unitAddress, signer);

    return toLowBN(await userUnits.balanceOf(userName));
  }

  public static async getUnitsQuantity(address: string, unitTypes: UnitType[]) {
    return Object.fromEntries(await Promise.all(unitTypes.map(async unitType => {
      return [unitType, await UnitHelper.getUnitQuantity(address, unitType)];
    })));
  }

  public static async getUnitStats(
    unitName: UnitType
  ) {
    const registryInstance = await WorldHelper.getRegistryInstance();
    return await registryInstance.unitsStats(unitName);
  }

  public static async getUnitsStats(unitTypes: UnitType[]): Promise<{[key in UnitType]: {
    weaponPowerStage1: BigNumber;
    armourPowerStage1: BigNumber;
    weaponPowerStage2: BigNumber;
    armourPowerStage2: BigNumber;
    siegePower: BigNumber;
    siegeMaxSupply: BigNumber;
    siegeSupport: BigNumber;
  }}> {
    return Object.fromEntries(await Promise.all(unitTypes.map(async unitType => {
      return [unitType, await UnitHelper.getUnitStats(unitType)];
    })));
  }

  public static async hireUnits(
    army: Army,
    unitTypes: UnitType[],
    unitQuantity: number,
    maxWeaponQuantity: number
  ) {
    const userSettlementAddress = await army.currentSettlement();
    const userSettlementInstance = Settlement__factory.connect(userSettlementAddress, army.signer);

    const userUnitZone = Zone__factory.connect(await userSettlementInstance.currentZone(), army.signer);
    await userUnitZone.buyUnitsBatch(
      ethers.constants.AddressZero.toString(),
      userSettlementAddress,
      unitTypes,
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(unitQuantity))),
      unitTypes.map(_ => transferableFromLowBN(new BigNumber(maxWeaponQuantity)))
    ).then(tx => tx.wait());
  }
}
