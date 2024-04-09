import { Settlement, TileCapturingSystem__factory } from "../../typechain-types";
import { toBN, transferableFromLowBN } from "../../scripts/utils/const";
import BigNumber from "bignumber.js";
import { EvmUtils } from "./EvmUtils";
import { MovementHelper } from "./MovementHelper";
import { WorldHelper } from "./WorldHelper";

export class CaptureHelper {
  public static async captureTile(
    settlementInstance: Settlement,
    tilePosition: number,
    prosperityStake: number
  ) {
    const registryInstance = await WorldHelper.getRegistryInstance();

    const captureTileDurationPerTile = toBN(await registryInstance.getCaptureTileDurationPerTile());

    const settlementPosition = await settlementInstance.position();
    const positionsPath = MovementHelper.getMovementPath(settlementPosition, tilePosition);
    const captureDuration = captureTileDurationPerTile.multipliedBy(positionsPath.length);

    await settlementInstance.beginTileCapture(tilePosition, transferableFromLowBN(new BigNumber(prosperityStake))).then(tx => tx.wait());
    await EvmUtils.increaseTime(captureDuration.toNumber());
    await settlementInstance.claimCapturedTile(tilePosition).then(tx => tx.wait());
  }

  public static async isTileCapturedBySettlement(
    tilePosition: number,
    settlementInstance: Settlement
  ) {
    const epochInstance = await WorldHelper.getCurrentEpochInstance();
    const tileCapturingSystemAddress = await epochInstance.tileCapturingSystem();
    const tileCapturingSystemInstance = TileCapturingSystem__factory.connect(tileCapturingSystemAddress, settlementInstance.signer);

    const capturedTiles = await tileCapturingSystemInstance.getCapturedTilesBySettlementAddress(settlementInstance.address);

    return !!capturedTiles.find((capturedTilePosition) => capturedTilePosition === tilePosition);
  }
}