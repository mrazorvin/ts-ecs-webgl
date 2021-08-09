import { InitComponent } from "@mr/ecs/World";

export class Visible extends InitComponent() {
  static override no_pool = true;
}
export const visible = new Visible();
