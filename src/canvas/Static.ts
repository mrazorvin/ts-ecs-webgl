import { InitComponent } from "@mr/ecs/World";

export class Static extends InitComponent({ use_pool: false }) {
  constructor() {
    super();
  }
}

export const static_comp = new Static();
