import BigNumber from "bignumber.js";
import { BigNumber as EthersBigNumber } from 'ethers';

export const _1e18 = new BigNumber(10).pow(18);

export function toBN(bn: EthersBigNumber): BigNumber {
    return new BigNumber(bn.toHexString(), 16);
}

export function toLowBN(bn: EthersBigNumber): BigNumber {
    return toBN(bn).dividedBy(_1e18);
}

export function toAbsLowBN(bn: EthersBigNumber): BigNumber {
    return toBN(bn).dividedToIntegerBy(_1e18);
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function transferableFromLowBN(value: BigNumber): string {
    return value.multipliedBy(_1e18).toFixed(0);
}

export function transferableFromBN(value: BigNumber): string {
    return value.toString(10);
}

export function cmpAddress(add1: string, add2: string) {
    if (!add1 || !add2) {
        return false;
    }

    return add1.toLowerCase() === add2.toLowerCase();
}
