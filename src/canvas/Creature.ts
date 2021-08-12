import { ComponentFactory } from "@mr/ecs/Component";
import { InitComponent } from "@mr/ecs/World";
import { main_world } from "./MainWorld";

export class Creature extends InitComponent({ use_pool: false }) {
  static create = ComponentFactory(Creature, (prev) => prev ?? new Creature());
}
export const creature = Creature.create(main_world);
