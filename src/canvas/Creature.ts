import { ComponentFactory } from "@mr/ecs/Component";
import { InitComponent } from "@mr/ecs/World";
import { main_world } from "./MainWorld";

export class Creature extends InitComponent() {
  static override no_pool = true;
  static create = ComponentFactory(Creature, (prev) => {
    return prev ?? new Creature();
  });
}
export const creature = Creature.create(main_world);

