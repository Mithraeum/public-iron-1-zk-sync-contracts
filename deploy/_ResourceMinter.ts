import {DeployFunction} from "hardhat-deploy/types";
import {transferableFromLowBN} from "../scripts/utils/const";
import BigNumber from "bignumber.js";
import { WorldHelper } from "../test/helpers/WorldHelper";

const func: DeployFunction = async function () {
    const worldProxyInstance = await WorldHelper.getWorldInstance();

    const currentEpochNumber = await worldProxyInstance.currentEpochNumber();

    const address = "0xB7C1044A6dBd372105fb7B12738e0Dd1971eBD0D";
    const resources = ["FOOD", "WOOD", "ORE", "WEAPON"];

    for (let i = 0; i < resources.length; i++) {
        const resource = resources[i];

        const tx = await worldProxyInstance.mintResources(
            currentEpochNumber,
            resource,
            address,
            transferableFromLowBN(new BigNumber(1000))
        );

        await tx.wait();
    }
};

func.tags = ["ResourceMinter"];
func.dependencies = ["ImmediatelyStartedGame"];
export default func;
