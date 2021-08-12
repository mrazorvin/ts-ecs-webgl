import { ComponentFactory } from "@mr/ecs/Component";
import { InitComponent } from "@mr/ecs/World";

export class Movement extends InitComponent({ use_pool: 20 }) {
  target: [x: number, y: number];

  static create = ComponentFactory(Movement, (prev, x: number, y: number) => {
    if (prev !== undefined) {
      prev.target[0] = x;
      prev.target[1] = y;

      return prev;
    }

    return new Movement(x, y);
  });

  constructor(x: number, y: number) {
    super();
    this.target = [x, y];
  }
}
