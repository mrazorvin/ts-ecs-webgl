import { ComponentFactory } from "@mr/ecs/Component";
import { InitComponent } from "@mr/ecs/World";

export class Creature extends InitComponent() {
  static override no_pool = true;
  static create = ComponentFactory(Creature, (prev) => {
    return prev ?? new Creature();
  });
}
