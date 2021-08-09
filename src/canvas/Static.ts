import { ComponentFactory } from "@mr/ecs/Component";
import { InitComponent } from "@mr/ecs/World";

export class Static extends InitComponent() {
  static create = ComponentFactory(Static, (prev, x, y) => {
    if (prev !== undefined) {
      prev.x = x;
      prev.y = y;

      return prev;
    }

    return new Static(x, y);
  });

  constructor(public x: number, public y: number) {
    super();
  }
}
