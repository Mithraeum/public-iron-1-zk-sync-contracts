type Cube = {
    x: number;
    y: number;
    z: number;
};

export function getPosition(x: number, y: number): number {
    return y * Math.pow(2, 16) + x;
}

export function getCoordinates(position: number): { x: number; y: number } {
    // tslint:disable-next-line:no-bitwise
    const y = position >>> 16;
    // tslint:disable-next-line:no-bitwise
    const x = position & 0xffff;
    return {x, y};
}

export function getShortestPathByPosition(from: number, to: number) {
    const fromCoordinates = getCoordinates(from);
    const toCoordinates = getCoordinates(to);
    return getShortestPath(fromCoordinates, toCoordinates);
}

export function getShortestPath(
    from: { x: number; y: number },
    to: { x: number; y: number }
) {
    const startCube = oddqToCube(from.x, from.y);
    const endCube = oddqToCube(to.x, to.y);
    const cubeLine = drawCubeLine(startCube, endCube);
    return cubeLine.slice(1, cubeLine.length).map(cubeToOddq);
}

function oddqToCube(col: number, row: number) {
    const x = col;
    // tslint:disable-next-line:no-bitwise
    const z = row - (col - (col & 1)) / 2;
    const y = -x - z;
    return { x, y, z };
}

function cubeToOddq(cube: Cube) {
    const col = cube.x;
    // tslint:disable-next-line:no-bitwise
    const row = cube.z + (cube.x - (cube.x & 1)) / 2;
    return { x: col, y: row };
}

function cubeDistance(a: Cube, b: Cube) {
    return (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z)) / 2;
}

function drawCubeLine(a: Cube, b: Cube) {
    const N = cubeDistance(a, b);
    const lerp = (a: number, b: number, t: number) => {
        return a + (b - a) * t;
    };
    const cubeLerp = (a: Cube, b: Cube, t: number) => {
        return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t) };
    };
    const result = [];
    for (let i = 0; i <= N; i++) {
        result.push(cubeRound(cubeLerp(a, b, (1.0 / N) * i)));
    }
    return result;
}

function cubeRound(cube: Cube) {
    let rx = Math.round(cube.x);
    let ry = Math.round(cube.y);
    let rz = Math.round(cube.z);

    const xDiff = Math.abs(rx - cube.x);
    const yDiff = Math.abs(ry - cube.y);
    const zDiff = Math.abs(rz - cube.z);
    if (xDiff > yDiff && xDiff > zDiff) {
        rx = -ry - rz;
    } else if (yDiff > zDiff) {
        ry = -rx - rz;
    } else {
        rz = -rx - ry;
    }
    return {
        x: rx,
        y: ry,
        z: rz,
    };
}
