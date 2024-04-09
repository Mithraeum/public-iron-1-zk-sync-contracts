import { getPosition, getShortestPathByPosition } from "../utils/position";
import { Army } from "../../typechain-types";
import { EvmUtils } from "./EvmUtils";
import BigNumber from "bignumber.js";
import { toBN, toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import { UnitHelper } from "./UnitHelper";
import { ArmyUnits } from "../core/BattleCoreTest";
import { ONE_HOUR_IN_SECONDS } from "../constants/time";
import { WorldHelper } from "./WorldHelper";

export class MovementHelper {
  public static getMovementPath(from: number, to: number) {
    const coordinatesPath = getShortestPathByPosition(from, to);
    return coordinatesPath.map((coordinate) => getPosition(coordinate.x, coordinate.y));
  }

  public static getPathMovementTime(movementPath: number[]) {
    return movementPath.length*5*ONE_HOUR_IN_SECONDS;
  }

  public static async moveArmy(army: Army, destination: number, foodToSpendOnFeeding: number, shouldWaitStun: boolean) {
    const positionBefore = await army.getCurrentPosition();
    const positionsPath = MovementHelper.getMovementPath(positionBefore, destination);

    await army.move(positionsPath, transferableFromLowBN(new BigNumber(foodToSpendOnFeeding))).then((tx) => tx.wait());
    const pathMovementTime = MovementHelper.getPathMovementTime(positionsPath)
    await EvmUtils.increaseTime(pathMovementTime);
    if (shouldWaitStun) {
      await army.updateState().then((tx) => tx.wait());
      const stunTiming = await army.stunTiming();
      const stunDuration = toBN(stunTiming.endTime).minus(toBN(stunTiming.startTime)).toNumber();
      await EvmUtils.increaseTime(stunDuration);
    }
  }

  public static async getFoodAmountForSpeedUp(army: Army, path: number[], speedUpBonusMultiplier: BigNumber) {
    const registryInstance = await WorldHelper.getRegistryInstance();

    const unitTypes = await registryInstance.getUnits();

    const foodAmountForUnits: ArmyUnits = Object.fromEntries(
      await Promise.all(
        unitTypes.map(async unitType => [unitType, (await UnitHelper.getUnitQuantity(army.address,
          unitType)).multipliedBy(toLowBN(await registryInstance.getUnitMaxFoodToSpendOnMove(unitType)))])
      )
    );

    const totalFoodAmountForUnits = Object.entries(foodAmountForUnits).reduce(
      (total, [unitType, foodAmountForUnit]) => {
        return total.plus(foodAmountForUnit.multipliedBy(path.length));
      },
      new BigNumber(0)
    );

    return totalFoodAmountForUnits.multipliedBy(new BigNumber(path.length).sqrt().toFixed(
      9, BigNumber.ROUND_DOWN)).multipliedBy(speedUpBonusMultiplier);
  }
}
