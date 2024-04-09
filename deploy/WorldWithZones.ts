import {HardhatRuntimeEnvironment} from "hardhat/types";
import {DeployFunction} from "hardhat-deploy/types";
import {Zone} from "../scripts/types/zone";
import {continent} from "../scripts/data/continents";
import {Epoch__factory, Geography__factory} from "../typechain-types";
import {cmpAddress} from "../scripts/utils/const";
import {ethers} from "ethers";
import { WorldHelper } from "../test/helpers/WorldHelper";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {worldDeployer} = await hre.getNamedAccounts();
    const worldSigner = await hre.ethers.getSigner(worldDeployer);

    const worldProxyInstance = await WorldHelper.getWorldInstance();

    console.log("Zones deployment started");

    const ensureZonesSet = async (zones: Zone[]): Promise<void> => {
        const geographyAddress = await worldProxyInstance.geography();
        const geographyInstance = Geography__factory.connect(geographyAddress, worldSigner);

        const zonesCount = (await geographyInstance.getZonesCount()).toNumber();
        console.log(`Current zones: ${zonesCount}`);

        // Create all zones
        for (let i = zonesCount; i < zones.length; i++) {
            const zone = zones[i];

            const txReceipt = await geographyInstance
                .createZone(zone.positions, zone.cultistsCoordinateIndex, zone.tileBonuses)
                .then((tx) => tx.wait());

            console.log(`Zone ${zone.zoneId} added ${txReceipt.gasUsed.toString()}`);
        }

        console.log(`All zones created`);

        const currentEpochNumber = await worldProxyInstance.currentEpochNumber();
        const currentEpochAddress = await worldProxyInstance.epochs(currentEpochNumber);
        const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, worldSigner);

        // Activate all zones
        const zoneActivations = await Promise.all(
            zones.map(async zone => {
                const zoneAddress = await currentEpochInstance.zones(zone.zoneId);
                const isZoneActivated = !cmpAddress(zoneAddress, ethers.constants.AddressZero);
                return {
                    zoneId: zone.zoneId,
                    isActivated: isZoneActivated,
                }
            })
        );

        const notActivatedZoneIds = zoneActivations
            .filter((value) => !value.isActivated)
            .map((value) => value.zoneId);

        console.log(`Not activated zones: ${notActivatedZoneIds.length}`);

        for (let i = 0; i < notActivatedZoneIds.length; i++) {
            const zoneId = notActivatedZoneIds[i];
            const txReceipt = await currentEpochInstance.activateZone(zoneId).then((tx) => tx.wait());
            console.log(`Zone ${zoneId} activated, gasCost=${txReceipt.gasUsed.toString()}`)
        }
    };

    await ensureZonesSet(continent.zones);

    console.log("Zones deployment finished");
};

func.tags = ["WorldWithZones"];
func.dependencies = ["EmptyWorld"];
export default func;
