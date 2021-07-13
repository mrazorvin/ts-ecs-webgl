import { Resource } from "@mr/ecs/World";

export class Screen extends Resource {
  constructor(public width: number = 800, public height: number = 600) {
    super();
  }
}
