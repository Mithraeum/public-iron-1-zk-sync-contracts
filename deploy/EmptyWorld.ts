import {DeployFunction} from "hardhat-deploy/types";
import {HardhatRuntimeEnvironment} from "hardhat/types";
import {deployBatch, ensureRightImplementation, setupDeployer} from "../scripts/deployer";
import {_1e18, cmpAddress, sleep} from "../scripts/utils/const";
import {Deployment} from "hardhat-deploy/dist/types";
import {ethers} from "ethers";
import {Unit} from "../scripts/types/unit";
import {units} from "../scripts/data/units";
import {
    CrossEpochsMemory__factory,
    Geography__factory,
    BannerParts__factory,
    Registry__factory,
    Resolver__factory,
    RewardPool__factory,
    World__factory,
    ArmyView__factory,
    Fort__factory,
} from "../typechain-types";
import {chunk, zip} from "lodash";
import {environment} from "../environment/environment";
import {IRegistry} from "../typechain-types/contracts/core/Registry";

const greenCheckmark = "\u001b[1;32m ✓\x1b[0m";

interface WorldAssetImplementation {
    groupType: string;
    assetType: string;
    deployment: Deployment;
}

interface WorldAssetFactory {
    groupType: string;
    deployment: Deployment;
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {deployments, getNamedAccounts} = hre;
    const {deploy} = deployments;

    const {worldDeployer} = await getNamedAccounts();
    const worldSigner = await hre.ethers.getSigner(worldDeployer);

    const network = await hre.ethers.provider.getNetwork();

    setupDeployer(deploy, worldDeployer);

    console.log("Empty world creation started");

    // Main proxies
    const [
        registryProxyDeployment,
        worldProxyDeployment,
        geographyProxyDeployment,
        crossEpochsMemoryProxyDeployment,
        rewardPoolProxyDeployment,
    ] = await deployBatch(
        {
            name: "RegistryProxy",
            contract: "SimpleProxy",
        },
        {
            name: "WorldProxy",
            contract: "SimpleProxy",
        },
        {
            name: "GeographyProxy",
            contract: "SimpleProxy",
        },
        {
            name: "CrossEpochsMemoryProxy",
            contract: "SimpleProxy",
        },
        {
            name: "RewardPoolProxy",
            contract: "SimpleProxy",
        }
    );

    // Checks if specified network has predefined resolver address, if it is not -> deploy resolver and assign env var
    if (!environment[hre.network.name].RESOLVER_ADDRESS) {
        const [resolverDeployment] = await deployBatch("Resolver");

        environment[hre.network.name].RESOLVER_ADDRESS = resolverDeployment.address;
    }

    // Check if specified network has predefined, if it is not -> probably new dev env, default global multiplier
    if (!environment[hre.network.name].GLOBAL_MULTIPLIER) {
        environment[hre.network.name].GLOBAL_MULTIPLIER = 1;
    }

    // Check if specified network has predefined, if it is not -> probably new dev env, default settlement starting price
    if (!environment[hre.network.name].SETTLEMENT_STARTING_PRICE) {
        environment[hre.network.name].SETTLEMENT_STARTING_PRICE = _1e18.multipliedBy(1000).toString(10);
    }

    const [mathExtensionDeployment, abdkMath64x64Deployment] = await deployBatch(
        "MathExtension",
        "ABDKMath64x64"
    );

    const [
        registryDeployment,
        worldDeployment,
        rewardPoolDeployment,
        crossEpochsMemoryDeployment,
        geographyDeployment,
        epochDeployment,
        zoneDeployment,
        workersPoolDeployment,
        settlementsMarketDeployment,
        unitsPoolDeployment,
        settlementDeployment,
        cultistsSettlementDeployment,
        farmDeployment,
        lumbermillDeployment,
        mineDeployment,
        smithyDeployment,
        fortDeployment,
        armyDeployment,
        battleDeployment,
        siegeDeployment,
        tileCapturingSystemDeployment,
        prosperityDeployment,
        resourceDeployment,
        unitsDeployment,
        workersDeployment,
        resourceFactoryDeployment,
        unitsFactoryDeployment,
        workersFactoryDeployment,
        prosperityFactoryDeployment,
        epochFactoryDeployment,
        zoneFactoryDeployment,
        workersPoolFactoryDeployment,
        settlementsMarketFactoryDeployment,
        unitsPoolFactoryDeployment,
        settlementFactoryDeployment,
        buildingFactoryDeployment,
        armyFactoryDeployment,
        battleFactoryDeployment,
        siegeFactoryDeployment,
        tileCapturingSystemFactoryDeployment,
        bannersDeployment,
        bannerPartsDeployment,
        distributionsDeployment,
        armyViewDeployment,
        battleViewDeployment,
        epochViewDeployment,
        settlementViewDeployment,
    ] = await deployBatch(
        "Registry",
        "World",
        "RewardPool",
        "CrossEpochsMemory",
        "Geography",
        {
            name: "Epoch",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        {
            name: "Zone",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        {
            name: "WorkersPool",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        {
            name: "SettlementsMarket",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
                ABDKMath64x64: abdkMath64x64Deployment.address,
            },
        },
        {
            name: "UnitsPool",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        {
            name: "Settlement",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        "CultistsSettlement",
        {
            name: "Farm",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        {
            name: "Lumbermill",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        {
            name: "Mine",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        {
            name: "Smithy",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        {
            name: "Fort",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        {
            name: "Army",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        {
            name: "Battle",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        {
            name: "Siege",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        "TileCapturingSystem",
        "Prosperity",
        "Resource",
        "Units",
        "Workers",
        "ResourceFactory",
        "UnitsFactory",
        "WorkersFactory",
        "ProsperityFactory",
        "EpochFactory",
        "ZoneFactory",
        "WorkersPoolFactory",
        "SettlementsMarketFactory",
        "UnitsPoolFactory",
        "SettlementFactory",
        "BuildingFactory",
        "ArmyFactory",
        "BattleFactory",
        "SiegeFactory",
        "TileCapturingSystemFactory",
        {
            name: "Banners",
            args: [
                "Banners",
                "BNR",
                `https://mit-flags-node.s3.eu-central-1.amazonaws.com/${
                    environment[hre.network.name].FLAG_JSON_CONFIG
                }/${network.chainId}/json/`,
            ],
        },
        {name: "BannerParts", args: ["Banner Parts", "BNRP", ""]},
        {name: "Distributions", args: [worldProxyDeployment.address, "https://mithraeum.io"]},
        {
            name: "ArmyView",
            libraries: {
                MathExtension: mathExtensionDeployment.address,
            },
        },
        "BattleView",
        "EpochView",
        "SettlementView"
    );

    const [settlementsListingsDeployment] = await deployBatch({
        name: "SettlementsListings",
        args: [bannersDeployment.address, worldProxyDeployment.address],
    });

    console.log("contracts deployment done");

    const updateFreeParts = async (ids: number[]) => {
        const bannerPartsInstance = BannerParts__factory.connect(bannerPartsDeployment.address, worldSigner);

        const chunks = chunk(ids, 10);

        const allParts: {id: number; isFreePart: boolean}[] = [];
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const chunkResponse = await Promise.all(
                chunk.map(async (id) => {
                    return {
                        id: id,
                        isFreePart: await bannerPartsInstance.isFreePart(id),
                    };
                })
            );

            allParts.push(...chunkResponse);
            await sleep(1000);
        }

        const freeParts = allParts.filter((part) => !part.isFreePart);
        if (freeParts.length === 0) {
            console.log(`Free parts are correct`);
            return;
        }

        await bannerPartsInstance.setFreeParts(
            freeParts.map((part) => part.id),
            freeParts.map((part) => true)
        );

        console.log(`${greenCheckmark} ${freeParts.length} free parts corrected`);
    };

    await updateFreeParts([
        ...[
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
            29, 30,
        ],
        ...[
            10000000000, 10000000001, 10000000002, 10000000003, 10000000004, 10000000005, 10000000006, 10000000007,
            10000000008, 10000000009, 10000000010, 10000000011, 10000000012, 10000000013, 10000000014, 10000000015,
            10000000016, 10000000017, 10000000018,
        ],
        ...[20000000000],
        ...[
            30000000000, 30000000001, 30000000002, 30000000003, 30000000004, 30000000005, 30000000006, 30000000007,
            30000000008, 30000000009,
        ],
        ...[
            40000000000, 40000000001, 40000000002, 40000000003, 40000000004, 40000000005, 40000000006, 40000000007,
            40000000008, 40000000009, 40000000010, 40000000011, 40000000012,
        ],
        ...[
            50000000000, 50000000001, 50000000002, 50000000003, 50000000004, 50000000005, 50000000006, 50000000007,
            50000000008, 50000000009, 50000000010, 50000000011, 50000000012, 50000000013, 50000000014,
        ],
    ]);

    // Cross epoch memory
    const isCrossEpochsMemoryImplementationChanged = await ensureRightImplementation(
        crossEpochsMemoryProxyDeployment,
        crossEpochsMemoryDeployment,
        worldSigner
    );

    if (isCrossEpochsMemoryImplementationChanged) {
        console.log(`${greenCheckmark} Cross epoch memory implementation updated`);
    } else {
        console.log(`Cross epoch memory implementation not changed, no need to update proxy`);
    }

    const crossEpochsMemoryProxyInstance = CrossEpochsMemory__factory.connect(
        crossEpochsMemoryProxyDeployment.address,
        worldSigner
    );
    const worldAddressInCrossEpochsMemory = await crossEpochsMemoryProxyInstance.world();

    if (!cmpAddress(worldAddressInCrossEpochsMemory, worldProxyDeployment.address)) {
        await crossEpochsMemoryProxyInstance.init(worldProxyDeployment.address).then((tx) => tx.wait());
        console.log(`${greenCheckmark} Geography initialized`);
    } else {
        console.log(`Geography is already initialized`);
    }

    // Geography
    const isGeographyImplementationChanged = await ensureRightImplementation(
        geographyProxyDeployment,
        geographyDeployment,
        worldSigner
    );

    if (isGeographyImplementationChanged) {
        console.log(`${greenCheckmark} Geography implementation updated`);
    } else {
        console.log(`Geography implementation not changed, no need to update proxy`);
    }

    const geographyProxyInstance = Geography__factory.connect(geographyProxyDeployment.address, worldSigner);
    const worldAddressInGeography = await geographyProxyInstance.world();

    if (!cmpAddress(worldAddressInGeography, worldProxyDeployment.address)) {
        await geographyProxyInstance.init(worldProxyDeployment.address).then((tx) => tx.wait());
        console.log(`${greenCheckmark} Geography initialized`);
    } else {
        console.log(`Geography is already initialized`);
    }

    // Registry
    const isRegistryImplementationChanged = await ensureRightImplementation(
        registryProxyDeployment,
        registryDeployment,
        worldSigner
    );

    if (isRegistryImplementationChanged) {
        console.log(`${greenCheckmark} Registry implementation updated`);
    } else {
        console.log(`Registry implementation not changed, no need to update proxy`);
    }

    const registryProxyInstance = Registry__factory.connect(registryProxyDeployment.address, worldSigner);
    const mightyCreator = await registryProxyInstance.mightyCreator();

    if (!cmpAddress(mightyCreator, worldDeployer)) {
        await registryProxyInstance
            .init(
                environment[hre.network.name].GLOBAL_MULTIPLIER,
                environment[hre.network.name].SETTLEMENT_STARTING_PRICE
            )
            .then((tx) => tx.wait());
        console.log(`${greenCheckmark} Registry initialized`);
    } else {
        console.log(`Registry is already initialized`);
    }

    // Reward pool
    const isRewardPoolImplementationChanged = await ensureRightImplementation(
        rewardPoolProxyDeployment,
        rewardPoolDeployment,
        worldSigner
    );

    if (isRewardPoolImplementationChanged) {
        console.log(`${greenCheckmark} Reward pool implementation updated`);
    } else {
        console.log(`Reward pool implementation not changed, no need to update proxy`);
    }

    const rewardPoolProxyInstance = RewardPool__factory.connect(rewardPoolProxyDeployment.address, worldSigner);
    const worldAddressInRewardPool = await rewardPoolProxyInstance.world();

    if (!cmpAddress(worldAddressInRewardPool, worldProxyDeployment.address)) {
        await rewardPoolProxyInstance.init(worldProxyDeployment.address).then((tx) => tx.wait());
        console.log(`${greenCheckmark} Reward pool initialized`);
    } else {
        console.log(`Reward pool is already initialized`);
    }

    const updateWorldAssetImplementations = async (
        worldAssetImplementations: WorldAssetImplementation[]
    ): Promise<void> => {
        const registryInstance = Registry__factory.connect(registryProxyDeployment.address, worldSigner);

        const implementationsAddresses = await Promise.all(
            worldAssetImplementations.map((worldAssetImplementation) => {
                const implementationId = ethers.utils.solidityKeccak256(
                    ["string", "string"],
                    [worldAssetImplementation.groupType, worldAssetImplementation.assetType]
                );
                return registryInstance.implementations(implementationId);
            })
        );

        const zippedImplementationsWithAddresses = zip(worldAssetImplementations, implementationsAddresses) as [
            WorldAssetImplementation,
            string
        ][];

        const incorrectImplementations = zippedImplementationsWithAddresses.filter(
            ([worldAssetImplementation, implementationsAddress]) => {
                return !cmpAddress(worldAssetImplementation.deployment.address, implementationsAddress);
            }
        );

        if (incorrectImplementations.length === 0) {
            console.log("All implementations correct");
            return;
        }

        const assetIds = incorrectImplementations.map(([worldAssetImplementation]) => {
            return ethers.utils.solidityKeccak256(
                ["string", "string"],
                [worldAssetImplementation.groupType, worldAssetImplementation.assetType]
            );
        });

        const implementationAddresses = incorrectImplementations.map(([worldAssetImplementation]) => {
            return worldAssetImplementation.deployment.address;
        });

        await registryInstance.setImplementations(assetIds, implementationAddresses).then((tx) => tx.wait());
        console.log(`${greenCheckmark} ${incorrectImplementations.length} implementations corrected`);
    };

    await updateWorldAssetImplementations([
        {groupType: "epoch", assetType: "BASIC", deployment: epochDeployment},
        {groupType: "zone", assetType: "BASIC", deployment: zoneDeployment},
        {groupType: "workersPool", assetType: "BASIC", deployment: workersPoolDeployment},
        {groupType: "settlementsMarket", assetType: "BASIC", deployment: settlementsMarketDeployment},
        {groupType: "unitsPool", assetType: "BASIC", deployment: unitsPoolDeployment},
        {groupType: "settlement", assetType: "BASIC", deployment: settlementDeployment},
        {groupType: "settlement", assetType: "CULTISTS", deployment: cultistsSettlementDeployment},
        {groupType: "building", assetType: "FARM", deployment: farmDeployment},
        {groupType: "building", assetType: "LUMBERMILL", deployment: lumbermillDeployment},
        {groupType: "building", assetType: "MINE", deployment: mineDeployment},
        {groupType: "building", assetType: "SMITHY", deployment: smithyDeployment},
        {groupType: "building", assetType: "FORT", deployment: fortDeployment},
        {groupType: "army", assetType: "BASIC", deployment: armyDeployment},
        {groupType: "battle", assetType: "BASIC", deployment: battleDeployment},
        {groupType: "siege", assetType: "BASIC", deployment: siegeDeployment},
        {groupType: "tileCapturingSystem", assetType: "BASIC", deployment: tileCapturingSystemDeployment},
        {groupType: "prosperity", assetType: "BASIC", deployment: prosperityDeployment},
        {groupType: "resource", assetType: "BASIC", deployment: resourceDeployment},
        {groupType: "units", assetType: "BASIC", deployment: unitsDeployment},
        {groupType: "workers", assetType: "BASIC", deployment: workersDeployment},
    ]);

    const updateWorldAssetFactories = async (worldAssetFactories: WorldAssetFactory[]): Promise<void> => {
        const registryInstance = Registry__factory.connect(registryProxyDeployment.address, worldSigner);

        const factoryAddressesFromRegistry = await Promise.all(
            worldAssetFactories.map((worldAssetFactory) => {
                const groupId = ethers.utils.solidityKeccak256(["string"], [worldAssetFactory.groupType]);
                return registryInstance.factoryContracts(groupId);
            })
        );

        const zippedFactoriesWithAddresses = zip(worldAssetFactories, factoryAddressesFromRegistry) as [
            WorldAssetFactory,
            string
        ][];

        const incorrectFactories = zippedFactoriesWithAddresses.filter(([worldAssetFactory, factoryAddress]) => {
            return !cmpAddress(worldAssetFactory.deployment.address, factoryAddress);
        });

        if (incorrectFactories.length === 0) {
            console.log("All factories correct");
            return;
        }

        const groupIds = incorrectFactories.map(([worldAssetFactory]) => {
            return ethers.utils.solidityKeccak256(["string"], [worldAssetFactory.groupType]);
        });

        const factoryAddresses = incorrectFactories.map(([worldAssetFactory]) => {
            return worldAssetFactory.deployment.address;
        });

        await registryProxyInstance.setFactoryContracts(groupIds, factoryAddresses).then((tx) => tx.wait());
        console.log(`${greenCheckmark} ${incorrectFactories.length} factories corrected`);
    };

    await updateWorldAssetFactories([
        {groupType: "resource", deployment: resourceFactoryDeployment},
        {groupType: "units", deployment: unitsFactoryDeployment},
        {groupType: "workers", deployment: workersFactoryDeployment},
        {groupType: "prosperity", deployment: prosperityFactoryDeployment},
        {groupType: "epoch", deployment: epochFactoryDeployment},
        {groupType: "zone", deployment: zoneFactoryDeployment},
        {groupType: "workersPool", deployment: workersPoolFactoryDeployment},
        {groupType: "settlementsMarket", deployment: settlementsMarketFactoryDeployment},
        {groupType: "unitsPool", deployment: unitsPoolFactoryDeployment},
        {groupType: "settlement", deployment: settlementFactoryDeployment},
        {groupType: "building", deployment: buildingFactoryDeployment},
        {groupType: "army", deployment: armyFactoryDeployment},
        {groupType: "battle", deployment: battleFactoryDeployment},
        {groupType: "siege", deployment: siegeFactoryDeployment},
        {groupType: "tileCapturingSystem", deployment: tileCapturingSystemFactoryDeployment},
    ]);

    const updateUnitsStats = async (units: Unit[]) => {
        const registryInstance = Registry__factory.connect(registryProxyDeployment.address, worldSigner);

        const unitsStatsFromRegistry: IRegistry.UnitStatsStruct[] = await Promise.all(
            units.map(unit => registryInstance.unitsStats(unit.worldName))
        );

        const zippedUnitsStats = zip(
            units,
            unitsStatsFromRegistry,
        ) as [Unit, IRegistry.UnitStatsStruct][];

        const incorrectUnits = zippedUnitsStats.filter(([unit, registryUnit]) => {
            return !Unit.compareUnitsStats(unit.toUnitStatsStruct(), registryUnit);
        });

        if (incorrectUnits.length === 0) {
            console.log("All units correct");
            return;
        }

        const unitTypes = incorrectUnits.map(([unit]) => {
            return unit.worldName;
        });

        const unitsStats = incorrectUnits.map(([unit]) => {
            return unit.toUnitStatsStruct();
        });

        await registryInstance.setUnitsStats(unitTypes, unitsStats).then((tx) => tx.wait());
        console.log(`${greenCheckmark} ${incorrectUnits.length} units corrected`);
    };

    await updateUnitsStats(units);

    const isWorldImplementationUpdated = await ensureRightImplementation(
        worldProxyDeployment,
        worldDeployment,
        worldSigner
    );

    if (isWorldImplementationUpdated) {
        console.log(`${greenCheckmark} World implementation updated`);
    } else {
        console.log(`World deployment not changed, no need to update proxy`);
    }

    const worldProxyInstance = World__factory.connect(worldProxyDeployment.address, worldSigner);
    const registryAddress = await worldProxyInstance.registry();
    const isWorldInitialized = !cmpAddress(registryAddress, ethers.constants.AddressZero);

    if (!isWorldInitialized) {
        await worldProxyInstance
            .init(
                registryProxyDeployment.address,
                crossEpochsMemoryProxyDeployment.address,
                geographyProxyDeployment.address,
                bannersDeployment.address,
                environment[hre.network.name].BLESS_TOKEN_ADDRESS,
                distributionsDeployment.address,
                rewardPoolProxyDeployment.address,
            )
            .then((tx) => tx.wait());

        console.log(`${greenCheckmark} World initialized`);
    } else {
        const [
            registryContractAddressInWorld,
            crossEpochsMemoryAddressInWorld,
            geographyContractAddressInWorld,
            bannersContractAddressInWorld,
            blessTokenAddressInWorld,
            distributionsAddressInWorld,
            rewardPoolAddressInWorld,
        ] = await Promise.all([
            worldProxyInstance.registry(),
            worldProxyInstance.crossEpochsMemory(),
            worldProxyInstance.geography(),
            worldProxyInstance.bannerContract(),
            worldProxyInstance.blessToken(),
            worldProxyInstance.distributions(),
            worldProxyInstance.rewardPool(),
        ]);

        if (!cmpAddress(registryContractAddressInWorld, registryProxyDeployment.address)) {
            throw new Error("REGISTRY IS NOT SAME AS IN WORLD, NEW DEPLOYMENT REQUIRED");
        }

        if (!cmpAddress(crossEpochsMemoryAddressInWorld, crossEpochsMemoryProxyDeployment.address)) {
            throw new Error("CROSS EPOCH MEMORY IS NOT SAME AS IN WORLD, NEW DEPLOYMENT REQUIRED");
        }

        if (!cmpAddress(geographyContractAddressInWorld, geographyProxyDeployment.address)) {
            throw new Error("REGISTRY IS NOT SAME AS IN WORLD, NEW DEPLOYMENT REQUIRED");
        }

        if (!cmpAddress(bannersContractAddressInWorld, bannersDeployment.address)) {
            throw new Error("BANNERS IS NOT SAME AS IN WORLD, NEW DEPLOYMENT REQUIRED");
        }

        if (!cmpAddress(blessTokenAddressInWorld, environment[hre.network.name].BLESS_TOKEN_ADDRESS)) {
            throw new Error("BLESS TOKEN IS NOT SAME AS IN WORLD, NEW DEPLOYMENT REQUIRED");
        }

        if (!cmpAddress(distributionsAddressInWorld, distributionsDeployment.address)) {
            throw new Error("DISTRIBUTIONS TOKEN IS NOT SAME AS IN WORLD, NEW DEPLOYMENT REQUIRED");
        }

        if (!cmpAddress(rewardPoolAddressInWorld, rewardPoolProxyDeployment.address)) {
            throw new Error("REWARD POOL IS NOT SAME AS IN WORLD, NEW DEPLOYMENT REQUIRED");
        }
    }

    console.log(`Empty world created`);

    const resolverInstance = Resolver__factory.connect(environment[hre.network.name].RESOLVER_ADDRESS!, worldSigner);
    const worldAddressInResolver = await resolverInstance.world();
    if (!cmpAddress(worldAddressInResolver, worldProxyDeployment.address)) {
        await resolverInstance.setWorldAddress(worldProxyDeployment.address).then((tx) => tx.wait());
        console.log(`${greenCheckmark} World address updated`);
    } else {
        console.log(`World address already updated`);
    }

    if (process.env.LOG_GRAPH_VARS) {
        console.log(`World: ${worldProxyDeployment.address} at ${JSON.stringify(worldProxyDeployment.receipt?.blockNumber)}`);
        console.log(`Geography: ${geographyProxyDeployment.address} at ${JSON.stringify(geographyProxyDeployment.receipt?.blockNumber)}`);
        console.log(`Banners: ${bannersDeployment.address} at ${JSON.stringify(bannersDeployment.receipt?.blockNumber)}`);
        console.log(`Distributions: ${distributionsDeployment.address} at ${JSON.stringify(distributionsDeployment.receipt?.blockNumber)}`);
    }
};

func.tags = ["EmptyWorld"];
func.dependencies = ["BlessTokenDefiner"];
export default func;
