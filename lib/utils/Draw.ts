import { GridPosition, Terrain, World } from '../service/Models';

/*
  x, y pixel coords for hex with vertices A--F at grid pos 0,0, equal sides of length S:
  A-F starting bottom left, go anticlockwise
  A: 0, 0.5 S
  B: 3^(1/2) S * 0.5, 0
  C: 3^(1/2) S, 0.5 S
  D: C + (0, S)
  E: B + (0, 2 S)
  F: A + (0, S)

  Offset by grid pos (diffX, diffY):
  add (3^(1/2) S * diffX, 0) + (3^(1/2) * 0.5 * S * diffY, 3^(1/2) S * diffY)
    */

// S: length in pixels of a side of a regular hex
export function hexSvg(pos: GridPosition, S: number, colour = "black"): string {
    const k = Math.sqrt(3);

    const pixelOffsetX = k * S * (pos.x + 0.5 * (pos.y % 2));
    const pixelOffsetY = k * S * pos.y;

    const Ax = pixelOffsetX;
    const Ay = 0.5 * S + pixelOffsetY;

    const Bx = 0.5 * k * S + pixelOffsetX;
    const By = pixelOffsetY;

    const Cx = k * S + pixelOffsetX;
    const Cy = 0.5 * S + pixelOffsetY;

    const Dx = Cx
    const Dy = Cy + S;

    const Ex = Bx;
    const Ey = By + 2 * S;

    const Fx = Ax;
    const Fy = Ay + S;

    const polylineSvg = `<polyline points="${Ax},${Ay} ${Bx},${By} ${Cx},${Cy} ${Dx},${Dy} ${Ex},${Ey} ${Fx},${Fy} ${Ax},${Ay}" fill="${colour}"/>`;
    return polylineSvg;
}

export function worldSvg(world: World): string {
    // to avoid overlapping segments and duplication, don't draw each hex individually
    // instead, draw all the interior hex boundaries and the exterior grid boundary

    const sideLength = 10; //pixels per hex side

    let svg = '<svg version="1.1" width="300" height="200" xmlns="http://www.w3.org/2000/svg">';

    for (let x = 0; x < world.terrain.length; x++) {
        for (let y = 0; y < world.terrain[x].length; y++) {
            svg += '\n';
            const colour = world.terrain[x][y] == Terrain.BLOCKED ? "red" : "black";
            svg += hexSvg({ x: x, y: y }, sideLength, colour);
        }
    }

    svg += '\n</svg>';
    return svg;
}

// needs to be rationalised to reuse worldSvg
export function visibilitySvg(terrain: Terrain[][], visibility: boolean[][], fromX: number, fromY: number): string {
    const sideLength = 10;

    let svg = '<svg version="1.1" width="300" height="200" xmlns="http://www.w3.org/2000/svg">';

    for (let x = 0; x < terrain.length; x++) {
        for (let y = 0; y < terrain[0].length; y++) {
            svg += '\n';

            let colour = "gray";
            if (visibility[x][y]) {
                colour = "white";
            }
            if (terrain[x][y] == Terrain.BLOCKED) {
                colour = "black";
            }
            if (x === fromX && y === fromY) {
                colour = "red";
            }
            svg += hexSvg({ x: x, y: y }, sideLength, colour);
        }
    }

    svg += '\n</svg>';
    return svg;
}

// extend this later to do more than just colours, eg render an icon inside a hex
// TODO: needs more work to be useful -- needs to be more general
export function styledHexesSvg(data: object[][], colorize: (o: object) => string) {
    const sideLength = 10;

    let svg = '<svg version="1.1" width="300" height="200" xmlns="http://www.w3.org/2000/svg">';

    for (let x = 0; x < data.length; x++) {
        for (let y = 0; y < data[0].length; y++) {
            svg += '\n';
            const colour = colorize(data[x][y]);
            svg += hexSvg({ x: x, y: y }, sideLength, colour);
        }
    }

    svg += '\n</svg>';
    return svg;
}
