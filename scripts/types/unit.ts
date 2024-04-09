import BigNumber from "bignumber.js";
import {IRegistry} from "../../typechain-types/contracts/core/Registry";

export class Unit {
    constructor(
        public worldName: string,
        public weaponPowerStage1: BigNumber,
        public armourPowerStage1: BigNumber,
        public weaponPowerStage2: BigNumber,
        public armourPowerStage2: BigNumber,
        public siegePower: BigNumber,
        public siegeMaxSupply: BigNumber,
        public siegeSupport: BigNumber,
    ) {
    }

    public toUnitStatsStruct(): IRegistry.UnitStatsStruct {
        return {
            weaponPowerStage1: this.weaponPowerStage1.toNumber(),
            armourPowerStage1: this.armourPowerStage1.toNumber(),
            weaponPowerStage2: this.weaponPowerStage2.toNumber(),
            armourPowerStage2: this.armourPowerStage2.toNumber(),
            siegePower: this.siegePower.toString(),
            siegeMaxSupply: this.siegeMaxSupply.toString(),
            siegeSupport: this.siegeSupport.toString(),
        }
    }

    public static compareUnitsStats(unit1: IRegistry.UnitStatsStruct, unit2: IRegistry.UnitStatsStruct): boolean {
        return [
            new BigNumber(unit1.weaponPowerStage1.toString()).eq(new BigNumber(unit2.weaponPowerStage1.toString())),
            new BigNumber(unit1.armourPowerStage1.toString()).eq(new BigNumber(unit2.armourPowerStage1.toString())),
            new BigNumber(unit1.weaponPowerStage2.toString()).eq(new BigNumber(unit2.weaponPowerStage2.toString())),
            new BigNumber(unit1.armourPowerStage2.toString()).eq(new BigNumber(unit2.armourPowerStage2.toString())),
            new BigNumber(unit1.siegePower.toString()).eq(new BigNumber(unit2.siegePower.toString())),
            new BigNumber(unit1.siegeMaxSupply.toString()).eq(new BigNumber(unit2.siegeMaxSupply.toString())),
            new BigNumber(unit1.siegeSupport.toString()).eq(new BigNumber(unit2.siegeSupport.toString())),
        ].every(cmpResult => cmpResult === true);
    }
}
