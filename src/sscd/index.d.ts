export class SSCDNotImplementedError {}
export const SSCDCollisionManager: {};
export const SSCDMath: {};

export class SSCDAabb {}

export class SSCDShape<T = {}> {
  set_collision_tags(tags: string[]): void;
  set_data<T>(data: T): void;
  get_data(): T;
}

export class SSCDWorld {
  constructor(config: { grid_size: number });
  add<T extends SSCDShape>(component: T): T;
  test_collision<T extends SSCDShape>(
    shape: SSCDShape,
    tags: string[] | undefined,
    cb: (shape: T) => undefined | void | boolean
  ): boolean;
}

export class SSCDVector {
  constructor(x: number, y: number);
}

export class SSCDCircle extends SSCDShape {
  constructor(pos: SSCDVector, radius: number);
}

export class SSCDCompositeShape {}
export class SSCDLine {}
export class SSCDLinesStrip {}
export class SSCDRectangle<T = {}> extends SSCDShape<T> {
  constructor(position: SSCDVector, size: SSCDVector);
}
