import {DeployFunction} from "hardhat-deploy/types";
import {ensureSettlementCreated} from "../test/fixtures/common/ensureSettlementCreated";
import {zones} from "../scripts/data/zones";
import {Zone} from "../scripts/types/zone";
import { getCoordinates } from "../test/utils/position";
import { deployments, getNamedAccounts } from "hardhat";

interface Coordinate {
    x: number;
    y: number;
}

function isEven(value: number) {
    return value % 2 === 0;
}

function getNeighborCoordinate(x: number, y: number, direction: number) {
    const getCoordinate = (x: number, y: number) => {
        return {
            x,
            y,
        };
    };

    const xIsEven = isEven(x);

    let neighborCoordinate: {x: number, y: number} = {
        x: 0,
        y: 0
    };
    switch (direction)  {
        case 0: neighborCoordinate = getCoordinate(x, y - 1);
            break;
        case 1: neighborCoordinate = xIsEven ? getCoordinate(x + 1, y - 1) : getCoordinate(x + 1, y);
            break;
        case 2: neighborCoordinate = xIsEven ? getCoordinate(x + 1, y) : getCoordinate(x + 1, y + 1);
            break;
        case 3: neighborCoordinate = getCoordinate(x, y + 1);
            break;
        case 4: neighborCoordinate = xIsEven ? getCoordinate(x - 1, y) : getCoordinate(x - 1, y + 1);
            break;
        case 5: neighborCoordinate = xIsEven ? getCoordinate(x - 1, y - 1) : getCoordinate(x - 1, y);
            break;
        default: 'error';
    }
    return {x: neighborCoordinate.x, y: neighborCoordinate.y};
}
function getCoordinatesByRadius(x: number, y: number, radius: number): {x: number; y: number}[] {
    let neighborCoordinates = [];
    let currentCoordinate: {x: number, y: number} = {
        x: x,
        y: y
    };
    for (let i = 0; i < radius; i++) {
        currentCoordinate = getNeighborCoordinate(currentCoordinate.x, currentCoordinate.y, 4);
    }
    for (let j = 0; j < 6; j++) {
        for (let i = 0; i < radius; i++) {
            currentCoordinate = getNeighborCoordinate(currentCoordinate.x, currentCoordinate.y, j);
            neighborCoordinates.push(currentCoordinate);
        }

    }
    return neighborCoordinates;
}

function isPossibleToPlaceSettlement(positionsForSettlements: Coordinate[], allCoordinates: Coordinate[], possibleSettlementCoordinate: Coordinate) {
    const validCoordinates = findValidCoordinates(positionsForSettlements, allCoordinates);
    for (let i = 0; i < validCoordinates.length; i++) {
        if(validCoordinates[i].x === possibleSettlementCoordinate.x && validCoordinates[i].y === possibleSettlementCoordinate.y) {
            return true;
        }
    }
    return false;
}

const findValidCoordinates = (usedCoordinates: Coordinate[], allCoordinates: Coordinate[]): Coordinate[] => {
    const invalidCoordinates = usedCoordinates.flatMap((coordinate) => [
        ...getCoordinatesByRadius(coordinate.x, coordinate.y, 1),
        ...getCoordinatesByRadius(coordinate.x, coordinate.y, 2),
        coordinate,
    ]);

    const validCoordinates = allCoordinates.filter((coordinate) => {
        const hasCoordinateInInvalidCoordinates = !!invalidCoordinates.find(
            (invalidCoordinate) => invalidCoordinate.x === coordinate.x && invalidCoordinate.y === coordinate.y
        );

        return !hasCoordinateInInvalidCoordinates;
    });

    return validCoordinates;
};

const func: DeployFunction = async function () {
    const {worldDeployer, testUser4 } = await getNamedAccounts();

    const worldAddress = (await deployments.get("WorldProxy")).address;

    const maxSettlements = 40;
    const zoneId = 2;
    const zoneInWhichPlaceSettlements: Zone = zones.find(zone => zone.zoneId === zoneId)!;
    const coordinates = zoneInWhichPlaceSettlements.positions
      .map((position) => {
          return getCoordinates(position);
      });
    
    const cultistsCoordinates = getCoordinates(zoneInWhichPlaceSettlements.positions[zoneInWhichPlaceSettlements.cultistsCoordinateIndex]);
    const coordinatesQueue: Coordinate[] = [cultistsCoordinates];
    const coordinatesForSettlements: Coordinate[] = [];

    while (coordinatesQueue.length > 1 || coordinatesForSettlements.length < maxSettlements) {
        let currentCoordinates = coordinatesQueue[0];
        let potentialSettlementCoordinates: Coordinate[] = getCoordinatesByRadius(currentCoordinates.x, currentCoordinates.y, 3);

        for (let i = 0; i < potentialSettlementCoordinates.length; i++) {
            const potentialSettlementCoordinate = potentialSettlementCoordinates[i];
            if (isPossibleToPlaceSettlement([...coordinatesForSettlements, cultistsCoordinates], coordinates, potentialSettlementCoordinate)) {
                coordinatesForSettlements.push(potentialSettlementCoordinate);
                coordinatesQueue.push(potentialSettlementCoordinate);
            }
        }
        coordinatesQueue.shift();
    }

    const _39Coordinates = coordinatesForSettlements.filter((_, index) => index < maxSettlements);

    for (let i = 0; i < _39Coordinates.length; i++) {
        await ensureSettlementCreated(worldDeployer, testUser4, worldAddress, `deployer${i}`, zoneId, {
            x: _39Coordinates[i].x,
            y: _39Coordinates[i].y,
        });
    }
};

func.tags = ["40Settlements"];
func.dependencies = ["ImmediatelyStartedGame"];
export default func;
