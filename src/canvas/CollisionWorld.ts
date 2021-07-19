import { Component, EntityRef, Resource } from "@mr/ecs/World";
import { SSCDShape, SSCDWorld } from "@mr/sscd";

// TODO: must be stored is SSCD
export class SSCDShapeRef {
  shape: SSCDShape<EntityRef> | undefined;
  constructor(shape?: SSCDShape<EntityRef>) {
    this.shape = shape;
  }
}

// TODO: Better naming
export class CollisionShape extends Component {
  constructor(public ref: SSCDShapeRef) {
    super();
  }
}

export class CollisionWorld extends Resource {
  // TODO: set world in constructor instead
  public world = new SSCDWorld({ grid_size: 32 * 5 });
  constructor() {
    super();
  }

  attach(ref: EntityRef, shape: SSCDShape<EntityRef>): CollisionShape {
    this.world.add(shape);
    shape.set_data(ref);

    return new CollisionShape(new SSCDShapeRef(shape));
  }
}
