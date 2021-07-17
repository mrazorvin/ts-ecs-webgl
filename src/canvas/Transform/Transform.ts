import { glMatrix, mat3 } from "gl-matrix";
import { Component, EntityRef, World } from "../../ecs/World";
import { DependenciesUtils } from "../Utils/DependenciesUtils";

const setView = DependenciesUtils.compileMemoizeFactory<
  [TranslateVec2, Scale, Rotation, ParentView]
>(5);

type TranslateVec2 = Float32Array | undefined;
type Scale = Float32Array | undefined;
type Rotation = number | undefined;
type ParentView = Float32Array | undefined;

export class Transform extends Component {
  position: Float32Array | undefined;
  scale: Float32Array | undefined;
  rotation: number | undefined;

  height: number;
  width: number;
  readonly to_center_offset: [number, number];
  readonly to_origin_offset: [number, number];

  _parent: EntityRef | undefined;
  _current_view: Float32Array;
  _previous_view: Float32Array;

  // OPTIMIZATION: Generate matrix in single operation, instead of multiple functions call
  // TODO: scale must be scalar inside the class
  // TRANSLATE: Should be split on x and y, otherwise matrix mutation doesn't reflected
  getView = setView((translate, scale, rotation, parent) => {
    const view = this._previous_view;
    this._previous_view = this._current_view;
    this._current_view = view;

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
      return (parent === undefined
        ? matrix
        : mat3.multiply(matrix, parent, matrix)) as Float32Array;
    } else {
      return (parent === undefined
        ? mat3.identity(view)
        : parent) as Float32Array;
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

    this._current_view = new Float32Array(9);
    this._previous_view = new Float32Array(9);
    this._parent = config.parent;

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
      parent_transform !== undefined
        ? Transform.view(world, parent_transform)
        : undefined
    );

    return result;
  }
}
