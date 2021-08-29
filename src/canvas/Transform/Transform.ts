import { ComponentFactory } from "@mr/ecs/Component";
import { glMatrix, mat3 } from "gl-matrix";
import { EntityRef, InitComponent, World } from "../../ecs/World";

function fast_transform(
  out: number[] | Float32Array,
  x: number,
  y: number,
  width: number,
  height: number,
  rotate: number,
  scale_x: number,
  scale_y: number
) {
  const s = rotate === 0 ? 0 : Math.sin(rotate);
  const c = rotate === 0 ? 1 : Math.cos(rotate);
  const center_x = width / 2;
  const center_y = height / 2;

  out[0] = c * scale_x;
  out[1] = s * scale_x;
  out[2] = 0;
  out[3] = -s * scale_y;
  out[4] = +c * scale_y;
  out[5] = 0;
  out[6] = -center_x * (c * scale_x) - center_y * (-s * scale_y) + (center_x + x);
  out[7] = -center_x * (s * scale_x) - center_y * (+c * scale_y) + (center_y + y);
  out[8] = 1;

  return out;
}

export class Transform extends InitComponent({ use_pool: false }) {
  static create = ComponentFactory(Transform, (_, config) => new Transform(config));

  version: number;
  meta: {
    parent: EntityRef | undefined;
    last_parent_version: number | undefined;
    view: Float32Array;
  };

  x: number;
  y: number;
  scale_x: number;
  scale_y: number;
  rotation: number;
  height: number;
  width: number;

  getView(parent_view: Float32Array | undefined, parent_version: number | undefined): Float32Array {
    const meta = this.meta;
    if ((this.version & 1) === 1 || meta.last_parent_version !== parent_version) {
      this.version += 1;
      meta.last_parent_version = parent_version;
      const view = fast_transform(
        meta.view,
        this.x,
        this.y,
        this.width,
        this.height,
        glMatrix.toRadian(this.rotation),
        this.scale_x,
        this.scale_y
      ) as Float32Array;
      return parent_view !== undefined ? (mat3.multiply(view, parent_view, view) as Float32Array) : view;
    }

    return meta.view;
  }

  constructor(config: {
    parent?: EntityRef | undefined;
    x: number;
    y: number;
    scale_x?: number;
    scale_y?: number;
    rotation?: number;
    height: number;
    width: number;
  }) {
    super();

    this.meta = {
      view: new Float32Array(9),
      parent: config.parent,
      last_parent_version: undefined,
    };

    this.version = 1;
    this.height = config.height;
    this.width = config.width;
    this.x = config.x ?? 0;
    this.y = config.y ?? 0;
    this.scale_x = config.scale_x ?? 1;
    this.scale_y = config.scale_y ?? 1;
    this.rotation = config.rotation ?? 0;
  }

  scale(x: number | undefined, y: number | undefined) {
    let change: undefined | number;
    if (x !== undefined && x !== this.scale_x) change = this.scale_x = x;
    if (y !== undefined && y !== this.scale_y) change = this.scale_y = y;
    if (change !== undefined && (this.version & 1) === 0) this.version += 1;
  }

  position(x: number | undefined, y: number | undefined) {
    let change: undefined | number;
    if (x !== undefined && this.x !== x) change = this.x = x;
    if (y !== undefined && this.y !== y) change = this.y = y;
    if (change !== undefined && (this.version & 1) === 0) this.version += 1;
  }

  dimension(width: number | undefined, height: number | undefined) {
    let change: undefined | number;
    if (width !== undefined) change = this.width = width;
    if (height !== undefined) change = this.height = height;
    if (change !== undefined && (this.version & 1) === 0) this.version += 1;
  }

  rotate(angle: number | undefined) {
    let change: undefined | number;
    if (angle !== undefined) change = this.rotation = angle;
    if (change !== undefined && (this.version & 1) === 0) this.version += 1;
  }
}

export namespace Transform {
  export function view(world: World, transform: Transform): Float32Array {
    const parent = transform.meta.parent?.entity;
    const parent_transform = parent ? Transform.get(parent) : undefined;

    const result = transform.getView(
      parent_transform !== undefined ? Transform.view(world, parent_transform) : undefined,
      parent_transform?.version
    );

    return result;
  }
}
