import { ComponentFactory } from "@mr/ecs/Component";
import { InitComponent, EntityRef, Resource, World, Entity } from "@mr/ecs/World";
import { SSCDShape, SSCDWorld } from "@mr/sscd";

// TODO: must be stored is SSCD
export class SSCDShapeRef {
  shape: SSCDShape<EntityRef> | undefined;
  constructor(shape?: SSCDShape<EntityRef>) {
    this.shape = shape;
  }
}

// TODO: Better naming
export class CollisionShape extends InitComponent() {
  static create = ComponentFactory(CollisionShape, (prev, ref) => {
    if (prev !== undefined) {
       prev.ref = ref;
       return prev;
    }

    return new CollisionShape(ref);
  });

  constructor(public ref: SSCDShapeRef) {
    super();
  }

  static override dispose(world: World, _: Entity, shape: CollisionShape) {
    const sscd = CollisionWorld.get(world);
    const _shape = shape.ref.shape;
    if (sscd !== undefined && _shape !== undefined) {
      sscd.world.remove(_shape);
    }
  }
}

export class CollisionWorld extends Resource {
  constructor(public world = new SSCDWorld({ grid_size: 32 * 5, readonly: false })) {
    super();
  }

  attach(ref: EntityRef, shape: SSCDShape<EntityRef>): CollisionShape {
    this.world.add(shape);
    shape.set_data(ref);

    return new CollisionShape(new SSCDShapeRef(shape));
  }
}

export class LocalCollisionWorld extends Resource {
  constructor(public world = new SSCDWorld({ grid_size: 32, readonly: true })) {
    super();
  }

  attach(shape: SSCDShape<EntityRef>): void {
    this.world.add(shape);
  }
}
