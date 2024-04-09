import {ethers} from "ethers";
import {_1e18} from "../scripts/utils/const";

export interface NetworkEnvironment {
    RESOLVER_ADDRESS?: string;
    BLESS_TOKEN_ADDRESS: string;
    FLAG_JSON_CONFIG: string;
    GLOBAL_MULTIPLIER: number;
    SETTLEMENT_STARTING_PRICE: string;
}

export interface Environment {
    [networkName: string]: NetworkEnvironment,
}

export const environment: Environment = {
    "hardhat": {
        BLESS_TOKEN_ADDRESS: ethers.constants.AddressZero,
        FLAG_JSON_CONFIG: "hardhat",
        GLOBAL_MULTIPLIER: 1,
        SETTLEMENT_STARTING_PRICE: _1e18.multipliedBy(1000).toString(10)
    },
    "xdaiPredev": {
        RESOLVER_ADDRESS: "0x365B81B494a99F1DAA778eaeA0BEbc950E8bE536",
        BLESS_TOKEN_ADDRESS: ethers.constants.AddressZero,//erc20 - "0x32678D9888b516FB8e5972dd205C54fdeC22C4ae"
        FLAG_JSON_CONFIG: "xdaiPredev",
        GLOBAL_MULTIPLIER: 1000,
        SETTLEMENT_STARTING_PRICE: _1e18.toString(10)
    },
    "xdaiDev": {
        RESOLVER_ADDRESS: "0xC30f5875EC9F68703d417e843F656eDBDAbe620B",
        BLESS_TOKEN_ADDRESS: ethers.constants.AddressZero,//"0x32678D9888b516FB8e5972dd205C54fdeC22C4ae"
        FLAG_JSON_CONFIG: "xdaiDev",
        GLOBAL_MULTIPLIER: 100,
        SETTLEMENT_STARTING_PRICE: _1e18.dividedToIntegerBy(10).toString(10)
    },
    "xdaiStage": {
        RESOLVER_ADDRESS: "0x50AdD8918f6de2d7fcB06BCad1e2586C1cF06540",
        BLESS_TOKEN_ADDRESS: ethers.constants.AddressZero,//0xdf2d68AF705DA9928E9E524621dbA3b0C92c312B
        FLAG_JSON_CONFIG: "xdaiStage",
        GLOBAL_MULTIPLIER: 10,
        SETTLEMENT_STARTING_PRICE: _1e18.multipliedBy(1).toString(10)
    },
    "xdaiRelease": {
        RESOLVER_ADDRESS: "0x2709a676fcebf88bb35fa63433338d5bb0df5318",
        BLESS_TOKEN_ADDRESS: ethers.constants.AddressZero,//"0x268b00641ae3BB8D274f4725CfAFD3a7c031644F",
        FLAG_JSON_CONFIG: "xdaiRelease",
        GLOBAL_MULTIPLIER: 1,
        SETTLEMENT_STARTING_PRICE: _1e18.multipliedBy(1000).toString(10)
    },
    "skaleChaos": {
        RESOLVER_ADDRESS: "0x8a0fF89f63e1865e1cd1f622D46f926b665E8C0d",
        BLESS_TOKEN_ADDRESS: ethers.constants.AddressZero,//"0x268b00641ae3BB8D274f4725CfAFD3a7c031644F",
        FLAG_JSON_CONFIG: "skaleChaos",
        GLOBAL_MULTIPLIER: 100,
        SETTLEMENT_STARTING_PRICE: _1e18.multipliedBy(0).toString(10)
    },
    "auroraTestnet": {
        RESOLVER_ADDRESS: "0xe3Ce9a2D0D24B0eac7a26394ca08BBf59b66e8f0",
        BLESS_TOKEN_ADDRESS: ethers.constants.AddressZero,//"0x268b00641ae3BB8D274f4725CfAFD3a7c031644F",
        FLAG_JSON_CONFIG: "skaleChaos",
        GLOBAL_MULTIPLIER: 100,
        SETTLEMENT_STARTING_PRICE: _1e18.multipliedBy(0).toString(10)
    },
    "arbSepolia": {
        RESOLVER_ADDRESS: "0xe3Ce9a2D0D24B0eac7a26394ca08BBf59b66e8f0",
        BLESS_TOKEN_ADDRESS: ethers.constants.AddressZero,//"0x268b00641ae3BB8D274f4725CfAFD3a7c031644F",
        FLAG_JSON_CONFIG: "arbSepolia",
        GLOBAL_MULTIPLIER: 100,
        SETTLEMENT_STARTING_PRICE: _1e18.multipliedBy(0).toString(10)
    },
    "zkSyncSepolia": {
        RESOLVER_ADDRESS: "0x56aB9C1183Db46541f4abE2aC598D7af0E1E3C8F",
        BLESS_TOKEN_ADDRESS: ethers.constants.AddressZero,//"0x268b00641ae3BB8D274f4725CfAFD3a7c031644F",
        FLAG_JSON_CONFIG: "zkSyncSepolia",
        GLOBAL_MULTIPLIER: 1000,
        SETTLEMENT_STARTING_PRICE: _1e18.multipliedBy(0).toString(10)
    },
    "zkSyncEra": {
        RESOLVER_ADDRESS: "0x32f99e1a611978EEE493e3712Cef1f1649d3DBB5",
        BLESS_TOKEN_ADDRESS: ethers.constants.AddressZero,//"0x268b00641ae3BB8D274f4725CfAFD3a7c031644F",
        FLAG_JSON_CONFIG: "zkSyncEra",
        GLOBAL_MULTIPLIER: 1000,
        SETTLEMENT_STARTING_PRICE: _1e18.multipliedBy(0).toString(10)
    },
}
