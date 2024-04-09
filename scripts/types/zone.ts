import {IGeography} from "../../typechain-types/contracts/core/geography/Geography";

export class Zone {
    constructor(
        public zoneId: number,
        public positions: number[],
        public tileTypes: number[],
        public cultistsCoordinateIndex: number,
        public tileBonuses: IGeography.TileBonusStruct[],
    ) {

    }
}
