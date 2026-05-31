export class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

export class Hex {
  constructor(
    public q: number,
    public r: number,
    public s: number,
  ) {
    if (Math.round(q + r + s) !== 0) throw new Error('q + r + s must be 0');
  }
}

export class OffsetCoord {
  constructor(
    public col: number,
    public row: number,
  ) {}
  public static EVEN = 1;
  public static ODD = -1;

  public static roffsetFromCube(offset: number, h: Hex): OffsetCoord {
    const col: number = h.q + (h.r + offset * (h.r & 1)) / 2;
    const row: number = h.r;
    if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
      throw new Error('offset must be EVEN (+1) or ODD (-1)');
    }
    return new OffsetCoord(col, row);
  }

  public static roffsetToCube(offset: number, h: OffsetCoord): Hex {
    const q: number = h.col - (h.row + offset * (h.row & 1)) / 2;
    const r: number = h.row;
    const s: number = -q - r;
    if (offset !== OffsetCoord.EVEN && offset !== OffsetCoord.ODD) {
      throw new Error('offset must be EVEN (+1) or ODD (-1)');
    }
    return new Hex(q, r, s);
  }
}

export class Orientation {
  constructor(
    public f0: number,
    public f1: number,
    public f2: number,
    public f3: number,
    public b0: number,
    public b1: number,
    public b2: number,
    public b3: number,
    public start_angle: number,
  ) {}
}

export class Layout {
  constructor(
    public orientation: Orientation,
    public size: Point,
    public origin: Point,
  ) {}
  public static pointy: Orientation = new Orientation(
    Math.sqrt(3.0),
    Math.sqrt(3.0) / 2.0,
    0.0,
    3.0 / 2.0,
    Math.sqrt(3.0) / 3.0,
    -1.0 / 3.0,
    0.0,
    2.0 / 3.0,
    0.5,
  );
  public static flat: Orientation = new Orientation(
    3.0 / 2.0,
    0.0,
    Math.sqrt(3.0) / 2.0,
    Math.sqrt(3.0),
    2.0 / 3.0,
    0.0,
    -1.0 / 3.0,
    Math.sqrt(3.0) / 3.0,
    0.0,
  );

  public hexToPixel(h: Hex): Point {
    const m: Orientation = this.orientation;
    const size: Point = this.size;
    const origin: Point = this.origin;
    const x: number = (m.f0 * h.q + m.f1 * h.r) * size.x;
    const y: number = (m.f2 * h.q + m.f3 * h.r) * size.y;
    return new Point(x + origin.x, y + origin.y);
  }

  public hexCornerOffset(corner: number): Point {
    const m: Orientation = this.orientation;
    const size: Point = this.size;
    const angle: number = (2.0 * Math.PI * (m.start_angle - corner)) / 6.0;
    return new Point(size.x * Math.cos(angle), size.y * Math.sin(angle));
  }

  public polygonCorners(h: Hex): Point[] {
    const corners: Point[] = [];
    const center: Point = this.hexToPixel(h);
    for (let i = 0; i < 6; i++) {
      const offset: Point = this.hexCornerOffset(i);
      corners.push(new Point(center.x + offset.x, center.y + offset.y));
    }
    return corners;
  }
}
