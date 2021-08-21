import { Resource } from "@mr/ecs/World";

export class Input extends Resource {
  static create(target: HTMLElement) {
    const input = new Input();

    input.context_info.container_offset_x = target.offsetLeft;
    input.context_info.container_offset_y = target.offsetTop;

    const prevent_default = (event: MouseEvent) => {
      event.preventDefault();
    };

    // @ts-expect-error
    if (Navigator.maxTouchPoints > 1) {
      input.mode = "mobile";

      const on_mouse_down = Input.get_on_mouse_down(input);
      const on_mouse_move = Input.get_on_mouse_move(input);
      const on_mouse_up = Input.get_on_mouse_up(input);

      target.addEventListener("mousedown", on_mouse_down);
      target.addEventListener("mousemove", on_mouse_move);
      target.addEventListener("mouseup", on_mouse_up);
      target.addEventListener("contextmenu", prevent_default);

      input.dispose = () => {
        target.removeEventListener("mousedown", on_mouse_down);
        target.removeEventListener("mousemove", on_mouse_move);
        target.removeEventListener("mouseup", on_mouse_up);
        target.removeEventListener("contextmenu", prevent_default);

        input.dispose = () => null;
      };
    } else {
      input.mode = "pc";

      const on_mouse_down = Input.get_on_mouse_down(input);
      const on_mouse_move = Input.get_on_mouse_move(input);
      const on_mouse_up = Input.get_on_mouse_up(input);

      target.addEventListener("mousedown", on_mouse_down);
      target.addEventListener("mouseup", on_mouse_up);
      target.addEventListener("mousemove", on_mouse_move);
      target.addEventListener("contextmenu", prevent_default);

      input.dispose = () => {
        target.removeEventListener("mousedown", on_mouse_down);
        target.removeEventListener("mouseup", on_mouse_up);
        target.removeEventListener("mousemove", on_mouse_move);
        target.removeEventListener("contextmenu", prevent_default);

        input.dispose = () => null;
      };
    }

    return input;
  }

  dispose = (): void => void 0;

  private mode: "mobile" | "pc" = "pc";

  context_info = {
    container_offset_x: 0,
    container_offset_y: 0,

    container_width: 0,
    container_height: 0,

    camera_x: 0,
    camera_y: 0,
    camera_width: 0,
    camera_height: 0,

    world_width: 0,
    world_height: 0,
  };

  #movement = new PointerInfo();
  #touch = new PointerInfo();

  private _movement: PointerInfo | undefined;
  private _touch: PointerInfo | undefined;

  movement(): undefined | PointerInfo {
    return this._movement !== undefined && this._touch === undefined ? this._movement : undefined;
  }

  touch(): undefined | PointerInfo {
    return this._touch !== undefined ? this._touch : undefined;
  }

  private start_movement() {
    this._movement = this.#movement;
  }

  private stop_movement() {
    this._movement = undefined;
  }

  private start_touch() {
    this._touch = this.#touch;
  }

  private stop_touch() {
    this._touch = undefined;
  }

  static get_on_mouse_down(input: Input) {
    return (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.button === 0) {
        input.start_movement();
      } else if (event.button === 2) {
        input.start_touch();
      } else {
        return;
      }

      const ctx = input.context_info;

      const click_x = ((event.pageX - ctx.container_offset_x) / ctx.container_width) * ctx.world_width;
      const click_y = ((event.pageY - ctx.container_offset_y) / ctx.container_height) * ctx.world_height;
      const current_x = ctx.camera_x + (click_x - ctx.world_width / 2) + ctx.camera_width / 2;
      const current_y = ctx.camera_y + (click_y - ctx.world_height / 2) + ctx.camera_height / 2;

      const target = (event.button === 0 ? input.movement() : input.touch())!;

      target.current_x = target.click_x = current_x;
      target.current_y = target.click_y = current_y;
    };
  }

  static get_on_mouse_up(input: Input) {
    return (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.button === 0) {
        input.stop_movement();
      } else if (event.button === 2) {
        input.stop_touch();
      }
    };
  }

  static get_on_mouse_move(input: Input) {
    return (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const ctx = input.context_info;

      const click_x = ((event.pageX - ctx.container_offset_x) / ctx.container_width) * ctx.world_width;
      const click_y = ((event.pageY - ctx.container_offset_y) / ctx.container_height) * ctx.world_height;
      const current_x = ctx.camera_x + (click_x - ctx.world_width / 2) + ctx.camera_width / 2;
      const current_y = ctx.camera_y + (click_y - ctx.world_height / 2) + ctx.camera_height / 2;

      const movement = input._movement;

      if (movement !== undefined) {
        movement.current_x = current_x;
        movement.current_y = current_y;
      }
    };
  }
}

class PointerInfo {
  current_x = 0;
  current_y = 0;

  click_x = 0;
  click_y = 0;
}
