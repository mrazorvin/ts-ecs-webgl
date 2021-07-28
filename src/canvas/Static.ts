import { InitComponent } from "@mr/ecs/World";

export class Static extends InitComponent() {
  constructor(public x = 0, public y = 0) {
    super();
  }
}
