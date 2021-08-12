import { ComponentFactory } from "@mr/ecs/Component";
import { glMatrix, mat3 } from "gl-matrix";
import { EntityRef, InitComponent, World } from "../../ecs/World";
import { DependenciesUtils } from "../Utils/DependenciesUtils";

const setView = DependenciesUtils.compileMemoizeFactory<
  [TranslateVec2, Scale, Rotation, ParentView, ParentViewChanged]
>(5);

type TranslateVec2 = Float32Array | undefined;
type Scale = Float32Array | undefined;
type Rotation = number | undefined;
type ParentView = Float32Array | undefined;
type ParentViewChanged = number | undefined;

export class Transform extends InitComponent({ use_pool: 100 }) {
  static create = ComponentFactory(Transform, (prev, config) => {
    if (prev !== undefined) {
      prev._parent = config.parent;
      prev._changed = 0;

      prev.height = config.height;
      prev.width = config.width;
      prev.to_center_offset[0] = config.width / 2;
      prev.to_center_offset[1] = config.height / 2;
      prev.to_origin_offset[0] = -config.width / 2;
      prev.to_origin_offset[1] = -config.height / 2;

      if (config.position) {
        prev.position = config.position;
      } else if (prev.position) {
        prev.position[0] = 0;
        prev.position[1] = 0;
      }

      if (config.scale !== undefined) {
        prev.scale = config.scale;
      } else if (prev.scale) {
        prev.scale[0] = 1;
        prev.scale[1] = 1;
      }

      prev.rotation = config.rotation;

      // @ts-expect-error
      prev.getView.clear();

      return prev;
    }

    return new Transform(config);
  });

  // TODO: all those values must be always defined
  //       it's hell to check them on non existence each time when
  //       we want to use it
  position: Float32Array | undefined;
  scale: Float32Array | undefined;
  rotation: number | undefined;

  height: number;
  width: number;

  // TODO: it's possible that we don't need this values at all
  readonly to_center_offset: [number, number];
  readonly to_origin_offset: [number, number];

  _changed: number;
  _parent: EntityRef | undefined;
  _view: Float32Array;

  // OPTIMIZATION: Generate matrix in single operation, instead of multiple functions call
  // TODO: scale must be scalar inside the class
  // TRANSLATE: Should be split on x and y, otherwise matrix mutation doesn't reflected
  getView = setView((translate, scale, rotation, parent) => {
    const view = this._view;
    this._changed += 1;

    let matrix = translate ? mat3.fromTranslation(view, translate) : undefined;
    if (rotation || scale) {
      matrix =
        matrix === undefined
          ? mat3.fromTranslation(view, this.to_center_offset)
          : mat3.translate(matrix, matrix, this.to_center_offset);
      matrix =
        rotation === undefined
          ? matrix
          : matrix === undefined
          ? mat3.fromRotation(view, glMatrix.toRadian(rotation))
          : mat3.rotate(matrix, matrix, glMatrix.toRadian(rotation));
      matrix =
        scale === undefined
          ? matrix
          : matrix === undefined
          ? mat3.fromScaling(view, scale)
          : mat3.scale(matrix, matrix, scale);
      matrix = mat3.translate(matrix, matrix, this.to_origin_offset);
    }

    if (matrix) {
      return (parent === undefined ? matrix : mat3.multiply(matrix, parent, matrix)) as Float32Array;
    } else {
      return (parent === undefined ? mat3.identity(view) : parent) as Float32Array;
    }
  });

  constructor(config: {
    parent?: EntityRef | undefined;
    position?: Float32Array;
    scale?: Float32Array;
    rotation?: number;
    height: number;
    width: number;
  }) {
    super();

    this._view = new Float32Array(9);
    this._parent = config.parent;
    this._changed = 0;

    this.height = config.height;
    this.width = config.width;
    this.to_center_offset = [this.width / 2, this.height / 2];
    this.to_origin_offset = [-this.width / 2, -this.height / 2];

    this.position = config.position;
    this.scale = config.scale;
    this.rotation = config.rotation;
  }
}

export namespace Transform {
  // OPTIMIZATION: Inject parent entities into Transform component
  export function view(world: World, transform: Transform): Float32Array {
    const parent = transform._parent?.entity;
    const parent_transform = parent ? Transform.get(parent) : undefined;

    const result = transform.getView(
      transform.position,
      transform.scale,
      transform.rotation,
      parent_transform !== undefined ? Transform.view(world, parent_transform) : undefined,
      parent_transform?._changed
    );

    return result;
  }
}
