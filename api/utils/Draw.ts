import { GridPosition, Terrain, World } from '../service/Models';

/** A point in grid (row, col) coordinates. */
export interface Point {
    x: number;
    y: number;
}

/** An axis-aligned rectangle in grid coordinates. */
export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

/** A circle defined by its center and radius, in grid coordinates. */
export interface Circle {
    centerX: number;
    centerY: number;
    radius: number;
}

/** Styling options shared by the SVG drawing helpers. */
export interface DrawOptions {
    color?: string;
    fillColor?: string;
    lineWidth?: number;
}

function inBounds<T>(grid: T[][], x: number, y: number): boolean {
    // x = column, y = row
    return y >= 0 && x >= 0 && y < grid.length && x < grid[y].length;
}

function setIfInBounds<T>(grid: T[][], x: number, y: number, value: T): void {
    if (inBounds(grid, x, y)) {
        grid[y][x] = value;
    }
}

/**
 * Draw a line between two grid points using Bresenham's algorithm.
 * Out-of-bounds points are skipped. Coordinates are (x = column, y = row).
 */
export function drawLine<T>(grid: T[][], from: Point, to: Point, value: T): void {
    let x0 = from.x;
    let y0 = from.y;
    const x1 = to.x;
    const y1 = to.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    // Guard against non-finite input to avoid an infinite loop.
    if (!Number.isFinite(x0) || !Number.isFinite(y0) || !Number.isFinite(x1) || !Number.isFinite(y1)) {
        return;
    }

    while (true) {
        setIfInBounds(grid, x0, y0, value);
        if (x0 === x1 && y0 === y1) {
            break;
        }
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }
}

/** Draw the outline of a rectangle in grid coordinates. */
export function drawRectangle<T>(grid: T[][], rect: Rectangle, value: T): void {
    const { x, y, width, height } = rect;
    if (width <= 0 || height <= 0) {
        return;
    }
    for (let i = 0; i < width; i++) {
        setIfInBounds(grid, x + i, y, value);
        setIfInBounds(grid, x + i, y + height - 1, value);
    }
    for (let j = 0; j < height; j++) {
        setIfInBounds(grid, x, y + j, value);
        setIfInBounds(grid, x + width - 1, y + j, value);
    }
}

/**
 * Draw the outline of a circle in grid coordinates using the midpoint circle
 * algorithm. Pixels outside the grid are ignored.
 */
export function drawCircle<T>(grid: T[][], circle: Circle, value: T): void {
    const { centerX, centerY, radius } = circle;
    if (!Number.isFinite(radius) || radius < 0) {
        return;
    }

    const plot8 = (cx: number, cy: number, x: number, y: number) => {
        setIfInBounds(grid, cx + x, cy + y, value);
        setIfInBounds(grid, cx - x, cy + y, value);
        setIfInBounds(grid, cx + x, cy - y, value);
        setIfInBounds(grid, cx - x, cy - y, value);
        setIfInBounds(grid, cx + y, cy + x, value);
        setIfInBounds(grid, cx - y, cy + x, value);
        setIfInBounds(grid, cx + y, cy - x, value);
        setIfInBounds(grid, cx - y, cy - x, value);
    };

    let x = radius;
    let y = 0;
    let err = 0;
    while (x >= y) {
        plot8(centerX, centerY, x, y);
        y++;
        if (err <= 0) {
            err += 2 * y + 1;
        } else {
            x--;
            err += 2 * (y - x) + 1;
        }
    }
}

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
/**
 * Render a single hexagon as an SVG `<polyline>`.
 * @param pos grid position (x = row, y = column)
 * @param S side length in pixels
 * @param colour fill colour
 */
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

/**
 * Render an entire world's terrain as an SVG document.
 * Blocked terrain is drawn in red, everything else in black.
 */
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
/**
 * Render a visibility overlay as an SVG document.
 * Not-visible tiles are gray, visible tiles white, blocked tiles black, and the
 * origin tile red.
 */
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
/**
 * Render a grid of arbitrary data as SVG hexes, delegating per-hex styling to
 * `getHexStyle`. `innerContent` (if returned) is appended inside the hex.
 */
export function styledHexesSvg<T>(
    data: T[][],
    getHexStyle: (o: T, pos: GridPosition, sideLength: number) => { fill?: string; innerContent?: string }
) {
    const sideLength = 10;
    const k = Math.sqrt(3); // For calculating hex centers if needed for innerContent positioning

    let svg = '<svg version="1.1" width="300" height="200" xmlns="http://www.w3.org/2000/svg">';

    for (let x = 0; x < data.length; x++) {
        for (let y = 0; y < data[x].length; y++) { // Use data[x].length for non-square grids
            svg += '\n';
            const style = getHexStyle(data[x][y], { x, y }, sideLength);
            svg += hexSvg({ x: x, y: y }, sideLength, style.fill || "transparent"); // Default to transparent if no fill
            if (style.innerContent) {
                // Basic centering for text, more complex positioning might be needed for icons
                // These are rough center calculations, assuming innerContent is SVG text or simple shapes
                const pixelOffsetX = k * sideLength * (x + 0.5 * (y % 2));
                const pixelOffsetY = k * sideLength * y; // This is top-left of bounding box, not center of hex

                // Approximate center of the hex for text.
                // Hex center Y is roughly (pixelOffsetY + pixelOffsetY + sideLength * 2) / 2 = pixelOffsetY + sideLength
                // Hex center X is roughly pixelOffsetX + (k * sideLength / 2)
                const centerX = pixelOffsetX + (k * sideLength / 2);
                const centerY = pixelOffsetY + sideLength; // Adjusted for S (sideLength)

                // Example: wrap innerContent in a group and translate, or expect innerContent to be self-positioned
                // For simplicity, this example doesn't try to perfectly center complex SVG,
                // but it provides a hook. A common pattern is for innerContent to be pre-positioned
                // relative to 0,0 and then use a <g transform="translate(cx,cy)"> wrapper.
                // Or, the getHexStyle function itself could return fully formed SVG for the inner content
                // including its own positioning.
                // For now, just append it. It's up to the caller to format innerContent.
                svg += style.innerContent;
            }
        }
    }

    svg += '\n</svg>';
    return svg;
}
