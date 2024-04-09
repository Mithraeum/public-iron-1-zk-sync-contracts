import {deployments, ethers, getNamedAccounts} from "hardhat";
import {
    Epoch__factory,
    Prosperity__factory,
    Registry__factory,
    Settlement,
    World__factory, Zone__factory
} from "../../typechain-types";

export class WorldHelper {
    public static async getWorldInstance(asAddress?: string) {
        if (!asAddress) {
            const {worldDeployer} = await getNamedAccounts();
            asAddress = worldDeployer;
        }

        const signer = await ethers.getSigner(asAddress);

        const worldAddress = (await deployments.get('WorldProxy')).address;
        return World__factory.connect(worldAddress, signer);
    }

    public static async getRegistryInstance() {
        const worldInstance = await this.getWorldInstance();

        const {worldDeployer} = await getNamedAccounts();
        const signer = await ethers.getSigner(worldDeployer);

        const registryAddress = await worldInstance.registry();
        return Registry__factory.connect(registryAddress, signer);
    }

    public static async getCurrentEpochNumber() {
        const worldInstance = await WorldHelper.getWorldInstance();
        return await worldInstance.currentEpochNumber();
    }

    public static async getCurrentEpochInstance() {
        const worldInstance = await WorldHelper.getWorldInstance();

        const {worldDeployer} = await getNamedAccounts();
        const signer = await ethers.getSigner(worldDeployer);

        const currentEpochNumber = await worldInstance.currentEpochNumber();
        const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);

        return Epoch__factory.connect(currentEpochAddress, signer);
    }

    public static async getProsperityInstance() {
        const {worldDeployer} = await getNamedAccounts();
        const signer = await ethers.getSigner(worldDeployer);

        const epoch = await WorldHelper.getCurrentEpochInstance();

        const prosperityAddress = await epoch.prosperity();
        return Prosperity__factory.connect(prosperityAddress, signer);
    }

    public static async getResources() {
        const registryInstance = await this.getRegistryInstance();
        return await registryInstance.getResources();
    }

    public static async mintWorkers(
        amount: string,
        to: string
    ) {
        const worldInstance = await WorldHelper.getWorldInstance();
        const currentEpochNumber = await WorldHelper.getCurrentEpochNumber();

        return await worldInstance
            .mintWorkers(
                currentEpochNumber,
                to,
                amount,
            )
            .then(tx => tx.wait());
    }

    public static async mintResource(
        resourceName: string,
        amount: string,
        to: string
    ) {
        const worldInstance = await WorldHelper.getWorldInstance();
        const currentEpochNumber = await WorldHelper.getCurrentEpochNumber();

        return await worldInstance
            .mintResources(
                currentEpochNumber,
                resourceName,
                to,
                amount,
            )
            .then(tx => tx.wait());
    }

    public static async summonCultistsInCurrentSettlementZone(
      settlementInstance: Settlement
    ) {
        const zoneAddress = await settlementInstance.currentZone();
        const zoneInstance = Zone__factory.connect(zoneAddress, settlementInstance.signer);

        await zoneInstance.summonCultists().then((tx) => tx.wait());
    }
}
