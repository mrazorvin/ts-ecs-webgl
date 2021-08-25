import { ComponentFactory } from "@mr/ecs/Component";
import { InitComponent } from "@mr/ecs/World";
import { main_world } from "./MainWorld";

export class Hero extends InitComponent({ use_pool: false }) {
  static create = ComponentFactory(Hero, (prev) => prev ?? new Hero());
}
export const hero = Hero.create(main_world);
