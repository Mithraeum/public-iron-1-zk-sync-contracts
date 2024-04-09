import { deployments, getNamedAccounts } from "hardhat";
import { UserHelper } from "../helpers/UserHelper";
import { UnitType } from "../enums/unitType";
import { WithEnoughResources } from "./WithEnoughResources";
import { MovementHelper } from "../helpers/MovementHelper";
import { SettlementHelper } from "../helpers/SettlementHelper";
import BigNumber from "bignumber.js";
import { FortHelper } from "../helpers/FortHelper";
import { UnitHelper } from "../helpers/UnitHelper";

export const WithArmiesOnOneSettlement = deployments.createFixture(
  async () => {
    await WithEnoughResources();

    const {testUser1, testUser2, testUser3 } = await getNamedAccounts();

    const unitQuantity = 2;
    const maxWeaponQuantity = 1000;
    const unitTypes = [UnitType.WARRIOR, UnitType.ARCHER, UnitType.HORSEMAN];
    const investWorkerQuantity = 2;
    const fortHealth = 6;

    const user1SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
    const user2SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser2, 1);
    const user3SettlementInstance = await UserHelper.getUserSettlementByNumber(testUser3, 1);

    await FortHelper.repairFort(user1SettlementInstance, investWorkerQuantity, new BigNumber(fortHealth));
    await FortHelper.repairFort(user2SettlementInstance, investWorkerQuantity, new BigNumber(fortHealth));
    await FortHelper.repairFort(user3SettlementInstance, investWorkerQuantity, new BigNumber(fortHealth));

    const army1 = await SettlementHelper.getArmy(user1SettlementInstance);
    const army2 = await SettlementHelper.getArmy(user2SettlementInstance);
    const army3 = await SettlementHelper.getArmy(user3SettlementInstance);

    await UnitHelper.hireUnits(army1, unitTypes, unitQuantity, maxWeaponQuantity);
    await UnitHelper.hireUnits(army2, unitTypes, unitQuantity, maxWeaponQuantity);
    await UnitHelper.hireUnits(army3, unitTypes, unitQuantity, maxWeaponQuantity);

    await MovementHelper.moveArmy(army1, await user2SettlementInstance.position(), 0, true);
    await MovementHelper.moveArmy(army3, await user2SettlementInstance.position(), 0, true);
  }
);
