import {Continent} from "../types/continent";
import {zones} from "./zones";

// Currently there is 50 zones in 'zones.ts'
const filteredZones = zones.filter((zone) => zone.zoneId <= 4);

export const continent = new Continent([...filteredZones]);
