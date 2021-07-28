import { EntityRef, Resource } from "@mr/ecs/World";
import { main_world } from "./MainWorld";
import { Transform } from "./Transform/Transform";
import { world_transform } from "./WorldView";

export class Camera extends Resource {
  constructor(public transform: Transform, public entity: EntityRef) {
    super();
  }

  set_position(x: number, y: number) {
    this.transform.position = new Float32Array([-x, -y]);
  }
}

// find better way to modify camera stats, for example in some aggregation object
export const camera_transform = new Transform({
  parent: world_transform.ref,
  height: 0,
  width: 0,
  position: new Float32Array([0, 0]),
});
export const camera_entity = main_world.entity([camera_transform]);
export const camera = new Camera(camera_transform, camera_entity.ref);
