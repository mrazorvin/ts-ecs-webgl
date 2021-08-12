import { ComponentFactory } from "@mr/ecs/Component";
import { InitComponent } from "@mr/ecs/World";
import { main_world } from "./MainWorld";

export class Visible extends InitComponent({ use_pool: false }) {
  static create = ComponentFactory(Visible, (prev) => {
    return prev ?? new Visible();
  });
}
export const visible = Visible.create(main_world);
