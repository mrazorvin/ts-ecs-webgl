import { InitComponent } from "@mr/ecs/World";

export class Modification extends InitComponent() {
  constructor(public movement_target = [0, 0]) {
    super();
  }
}
