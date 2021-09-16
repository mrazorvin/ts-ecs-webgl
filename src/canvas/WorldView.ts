import { main_world } from "./MainWorld";
import { BaseTransform, Transform } from "./Transform/Transform";

export const world_transform_component = Transform.create(main_world, {
  x: -1,
  y: 1,
  scale_x: 1,
  scale_y: -1,
  height: 0,
  width: 0,
  parent: BaseTransform.None,
});

// should be available globally
export const world_transform = main_world.entity([world_transform_component]);
