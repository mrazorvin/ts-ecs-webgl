import { EntityRef, Resource } from "@mr/ecs/World";
import { main_world } from "./MainWorld";
import { BaseTransform, Transform } from "./Transform/Transform";

export class Camera extends Resource {
  constructor(public transform: Transform, public entity: EntityRef) {
    super();
  }

  set_position(x: number, y: number) {
    this.transform.position(-x, -y);
  }

  dispose() {}
}

// find better way to modify camera stats, for example in some aggregation object
export const camera_transform = Transform.create(main_world, {
  parent: BaseTransform.World,
  height: 0,
  width: 0,
  x: 0,
  y: 0,
});
export const camera_entity = main_world.entity([camera_transform]);
export const camera = new Camera(camera_transform, camera_entity.ref);
