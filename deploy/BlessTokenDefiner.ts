import {DeployFunction} from "hardhat-deploy/types";
import {HardhatRuntimeEnvironment} from "hardhat/types";
import {environment} from "../environment/environment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    if (environment[hre.network.name]?.BLESS_TOKEN_ADDRESS) {
        console.log(`Network ${hre.network.name} already has BLESS_TOKEN_ADDRESS defined`);
        return;
    }

    console.log(`Network ${hre.network.name} does not have BLESS_TOKEN_ADDRESS defined, deploying`);

    const {deployments, getNamedAccounts} = hre;
    const {deploy} = deployments;
    const {worldDeployer} = await getNamedAccounts();

    const stubBlessTokenDeployment = await deploy('StubBlessToken', {
        from: worldDeployer,
        args: ["Stub Bless Token", "SBT"],
        log: true,
    });

    environment[hre.network.name] = {
        ...environment[hre.network.name],
        BLESS_TOKEN_ADDRESS: stubBlessTokenDeployment.address,
    }

    console.log(`BLESS_TOKEN_ADDRESS defined`);
}

func.tags = ["BlessTokenDefiner"];
export default func;
