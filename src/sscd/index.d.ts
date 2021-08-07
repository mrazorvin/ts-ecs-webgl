export class SSCDNotImplementedError {}
export const SSCDCollisionManager: {};
export const SSCDMath: {};

export class SSCDAabb {}

export class SSCDShape<T = {}> {
  __position: SSCDVector;
  set_collision_tags(tags: string[]): void;
  set_data<T>(data: T): void;
  get_data(): T;
  move_to(x: number, y: number): void;
}

interface SmartCollection {
  elements: SSCDShape[];
  size: number;
}

export class SSCDWorld {
  constructor(config: { grid_size: number; size?: number; readonly?: boolean });
  add<T extends SSCDCircle | SSCDRectangle>(component: T): T;
  remove<T extends SSCDShape>(component: T): T;
  move_to(x: number, y: number): void;
  test_collision<T extends SSCDShape>(
    shape: SSCDShape,
    tags: string[] | undefined,
    cb: (shape: T) => undefined | void | boolean
  ): boolean;
  __grid: Array<Array<SmartCollection>>;
  clear(): void;
}

export class SSCDVector {
  x: number;
  y: number;
  constructor(x: number, y: number);
}

export class SSCDCircle extends SSCDShape {
  constructor(pos: SSCDVector, radius: number);
  __grid_chunks: { size: number; chunks: Array<SmartCollection> };
}

export class SSCDCompositeShape {}
export class SSCDLine {}
export class SSCDLinesStrip {}
export class SSCDRectangle<T = {}> extends SSCDShape<T> {
  constructor(position: SSCDVector, size: SSCDVector);
}
