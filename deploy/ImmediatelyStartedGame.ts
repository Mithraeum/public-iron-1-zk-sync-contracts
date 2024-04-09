import {DeployFunction} from "hardhat-deploy/types";
import {EvmUtils} from "../test/helpers/EvmUtils";
import { WorldHelper } from "../test/helpers/WorldHelper";

const func: DeployFunction = async function () {
    const currentTime = process.env.GAME_START_TIME || await EvmUtils.getCurrentTime();

    const worldProxyInstance = await WorldHelper.getWorldInstance();
    await worldProxyInstance.setGameStartTime(currentTime);

    console.log("Game start time set");
}

func.tags = ["ImmediatelyStartedGame"];
func.dependencies = ["WorldWithZones"];
export default func;
