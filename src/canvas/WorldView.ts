import { main_world } from "./MainWorld";
import { Transform } from "./Transform/Transform";

export const world_transform_component = Transform.create(main_world, {
  position: new Float32Array([-1, 1]),
  scale: new Float32Array([1, -1]),
  height: 0,
  width: 0,
});

// should be available globally
export const world_transform = main_world.entity([world_transform_component]);
