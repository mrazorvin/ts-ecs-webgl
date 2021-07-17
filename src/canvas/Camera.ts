import { EntityID, EntityRef, Resource } from "@mr/ecs/World";
import { Transform } from "./Transform/Transform";

export class Camera extends Resource {
  constructor(public transform: Transform, public entity: EntityRef) {
    super();
  }

  set_position(x: number, y: number) {
    this.transform.position = new Float32Array([-x, -y]);
  }
}
