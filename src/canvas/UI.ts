import { ComponentFactory, InitComponent } from "@mr/ecs/Component";
import { EntityRef, Resource, World } from "@mr/ecs/World";
import { SSCDShape, SSCDWorld } from "@mr/sscd";

export class UI extends InitComponent({ use_pool: false }) {
  static create = ComponentFactory(UI, (_, id, shape) => new UI(id, shape));

  constructor(public id: string, public shape: SSCDShape<EntityRef> | undefined) {
    super();
  }
}

export class MobileUI extends InitComponent({ use_pool: false }) {
  static create = ComponentFactory(MobileUI, (_, id) => new MobileUI());
}

export const mobile_ui = MobileUI.create(new World());

export class DesktopUI extends InitComponent({ use_pool: false }) {
  static create = ComponentFactory(DesktopUI, (_, id) => new DesktopUI());
}

export const desktop_ui = DesktopUI.create(new World());

export class UILayout {
  lcw = new SSCDWorld({ grid_size: 32 * 5, readonly: false });
}

export class UIManager extends Resource {
  layouts = new Map<string, UILayout>();

  dispose() {
    this.layouts.clear();
  }
}
