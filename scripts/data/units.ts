import {Unit} from "../types/unit";
import BigNumber from "bignumber.js";
import {_1e18} from "../utils/const";
import {Time} from "../utils/time";

const siegePowerInDay = new BigNumber(1).multipliedBy(_1e18);
const siegePowerInSecond = siegePowerInDay.dividedToIntegerBy(Time.days(1));
const siegeMaxSupply = new BigNumber(10).multipliedBy(_1e18);

export const units = [
    new Unit(
        "WARRIOR",
        new BigNumber(2),
        new BigNumber(10),
        new BigNumber(10),
        new BigNumber(15),
        siegePowerInSecond,
        siegeMaxSupply,
        siegePowerInSecond.multipliedBy(new BigNumber(2)),
    ),
    new Unit(
        "ARCHER",
        new BigNumber(5),
        new BigNumber(10),
        new BigNumber(2),
        new BigNumber(20),
        siegePowerInSecond,
        siegeMaxSupply,
        siegePowerInSecond.multipliedBy(new BigNumber(2)),
    ),
    new Unit(
        "HORSEMAN",
        new BigNumber(5),
        new BigNumber(20),
        new BigNumber(2),
        new BigNumber(10),
        siegePowerInSecond,
        siegeMaxSupply,
        siegePowerInSecond.multipliedBy(new BigNumber(2)),
    ),
];
