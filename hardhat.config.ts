import {HardhatUserConfig} from "hardhat/config";

import "@matterlabs/hardhat-zksync-solc";

import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-deploy';
import 'solidity-docgen';

const dotenv = require("dotenv");
dotenv.config({path: __dirname + '/.env'});

const config: HardhatUserConfig = {
    zksolc: { // need to reference zksolc compiler
        version: "latest",
        compilerSource: "binary",
    },
    solidity: {
        version: "0.8.17",
        settings: {
            optimizer: {
                enabled: true,
                runs: 300
            }
        },
    },
    namedAccounts: {
        worldDeployer: 0,

        //for tests (no need to provide private key)
        testUser1: 1,
        testUser2: 2,
        testUser3: 3,
        testUser4: 4
    },
    networks: {
        hardhat: {
            live: false,
            saveDeployments: true,
            tags: ["hardhat-memory"]
        },
        xdaiPredev: {
            saveDeployments: true,
            //"https://rpc.eu-central-2.gateway.fm/v1/gnosis/non-archival/mainnet",
            //"https://rpc.gnosischain.com",
            url: "https://rpc.eu-central-2.gateway.fm/v1/gnosis/non-archival/mainnet",
            tags: ["xdaiPredev"],
            accounts: [
                process.env.WORLD_DEPLOYER_PK!,
            ],
        },
        xdaiDev: {
            // url: "https://rpc.gnosischain.com",
            url: "https://rpc.eu-central-2.gateway.fm/v1/gnosis/non-archival/mainnet",
            // url: "https://rpc.eu-central-2.gateway.fm/v4/gnosis/non-archival/mainnet?apiKey=woZPH881Lm68C3cOdGNWysbpgplCw4id.un6wMKDCejpmYmJM",
            saveDeployments: true,
            tags: ["xdaiDev"],
            accounts: [
                process.env.WORLD_DEPLOYER_PK!,
            ],
        },
        xdaiStage: {
            saveDeployments: true,
            url: "https://rpc.eu-central-2.gateway.fm/v1/gnosis/non-archival/mainnet",
            // url: "https://rpc.gnosischain.com",
            tags: ["xdaiStage"],
            accounts: [
                process.env.WORLD_DEPLOYER_PK!,
            ],
        },
        xdaiRelease: {
            saveDeployments: true,
            // url: "https://rpc.gnosischain.com",
            url: "https://rpc.eu-central-2.gateway.fm/v1/gnosis/non-archival/mainnet",
            tags: ["xdaiRelease"],
            accounts: [
                process.env.WORLD_DEPLOYER_PK_HIDDEN!,
            ],
        },
        skaleChaos: {
            url: "https://staging-v3.skalenodes.com/v1/staging-fast-active-bellatrix",
            saveDeployments: true,
            tags: ["skaleChaos"],
            accounts: [process.env.WORLD_DEPLOYER_PK!],
        },
        auroraTestnet: {
            url: "https://testnet.aurora.dev",
            saveDeployments: true,
            tags: ["auroraTestnet"],
            accounts: [process.env.WORLD_DEPLOYER_PK!],
        },
        arbSepolia: {
            url: "https://sepolia-rollup.arbitrum.io/rpc",
            saveDeployments: true,
            tags: ["auroraTestnet"],
            accounts: [process.env.WORLD_DEPLOYER_PK!],
        },
        zkSyncSepolia: {
            url: "https://sepolia.era.zksync.dev",
            saveDeployments: true,
            tags: ["zkSyncSepolia"],
            accounts: [process.env.WORLD_DEPLOYER_PK!],
            zksync: true,
        },
        zkSyncEra: {
            url: "https://1rpc.io/zksync2-era",
            saveDeployments: true,
            tags: ["zkSyncEra"],
            accounts: [process.env.WORLD_DEPLOYER_PK!],
            zksync: true,
        }
    },
    paths: {
        deploy: 'deploy',
        deployments: 'deployments',
    },
    docgen: {
        outputDir: './docs/generated',
        pages: "files",
        templates: "./docs/templates",
    }
};

export default config;
