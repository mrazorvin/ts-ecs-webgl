export class SSCDNotImplementedError {}
export const SSCDCollisionManager: {};
export const SSCDMath: {};

export class SSCDAabb {}

export class SSCDShape {
  set_collision_tags(tags: string[]): void;
}

export class SSCDWorld {
  add<T extends SSCDShape>(component: T): T;
  test_collision<T extends SSCDShape>(
    shape: T,
    tags: string[],
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
export class SSCDRectangle {}
