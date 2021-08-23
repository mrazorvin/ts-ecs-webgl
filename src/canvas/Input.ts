import { Entity, EntityRef, Resource } from "@mr/ecs/World";
import { SSCDCircle, SSCDShape, SSCDVector } from "@mr/sscd";
import { UILayout } from "./UI";

export class Input extends Resource {
  static create(target: HTMLElement) {
    const input = new Input();

    input.context_info.container_offset_x = target.offsetLeft;
    input.context_info.container_offset_y = target.offsetTop;

    const prevent_default = (event: MouseEvent | TouchEvent) => {
      event.preventDefault();
    };

    if (navigator.maxTouchPoints > 1) {
      console.log("mobile mode");
      input.mode = "mobile";
      const on_touch_start = (event: TouchEvent) => {
        event.preventDefault();

        const touches = event.changedTouches;
        const movement = input._movement;
        const click = input._touch;
        let movement_touch: Touch | undefined = undefined;
        let click_touch: Touch | undefined = undefined;

        for (let i = 0; i < touches.length; i++) {
          const touch = touches[i]!;
          if (movement === undefined && movement_touch === undefined && touch.identifier !== click?.identifier) {
            movement_touch = touch;
          } else if (click === undefined && click_touch === undefined && touch.identifier !== movement?.identifier) {
            click_touch = touch;
          }
        }

        if (movement_touch !== undefined) {
          input.start_movement(movement_touch.identifier);
          this.update_current_values(input, movement_touch, input._movement!);
          input._movement!.click_x = input._movement!.current_x;
          input._movement!.click_y = input._movement!.current_y;
          input._movement!.screen_click_x = input._movement!.screen_current_x;
          input._movement!.screen_click_y = input._movement!.screen_current_y;

          if (input._layout !== undefined) {
            input._layout.lcw.test_collision(
              new SSCDCircle(new SSCDVector(input._movement!.screen_click_x, input._movement!.screen_click_y), 2),
              undefined,
              () => {
                input.stop_movement();
                click_touch = movement_touch;
                return false;
              }
            );
          }
        }

        if (click_touch !== undefined) {
          input.start_touch(click_touch.identifier);
          this.update_current_values(input, click_touch, input._touch!);
          input._touch!.click_x = input._touch!.current_x;
          input._touch!.click_y = input._touch!.current_y;
          input._touch!.screen_click_x = input._touch!.screen_current_x;
          input._touch!.screen_click_y = input._touch!.screen_current_y;
        }
      };

      target.addEventListener("touchstart", on_touch_start);

      const on_touch_move = (event: TouchEvent) => {
        event.preventDefault();

        let movement = input._movement;
        let click = input._touch;
        let movement_touch: Touch | undefined;
        let click_touch: Touch | undefined;
        const touches = event.changedTouches;

        for (let i = 0; i < touches.length; i++) {
          const touch = touches[i]!;
          if (touch.identifier === movement?.identifier) {
            movement_touch = touch;
          } else if (touch.identifier === click?.identifier) {
            click_touch = touch;
          }
        }

        if (movement_touch !== undefined && movement !== undefined) {
          this.update_current_values(input, movement_touch, movement);
        }

        if (click_touch !== undefined && click !== undefined) {
          this.update_current_values(input, click_touch, click);
        }
      };

      target.addEventListener("touchmove", on_touch_move);

      const on_touch_end = (event: TouchEvent) => {
        let movement = input._movement;
        let click = input._touch;
        let movement_touch: Touch | undefined;
        let click_touch: Touch | undefined;
        const touches = event.changedTouches;

        for (let i = 0; i < touches.length; i++) {
          const touch = touches[i]!;
          if (touch.identifier === movement?.identifier) {
            movement_touch = touch;
          } else if (touch.identifier === click?.identifier) {
            click_touch = touch;
          }
        }

        if (movement_touch !== undefined && movement !== undefined) input.stop_movement();
        if (click_touch !== undefined && click !== undefined) input.stop_touch();
      };

      target.addEventListener("touchend", on_touch_end);
      target.addEventListener("touchcancel", on_touch_end);
      target.addEventListener("contextmenu", prevent_default);

      input.dispose = () => {
        target.removeEventListener("touchstart", on_touch_start);
        target.removeEventListener("touchmove", on_touch_move);

        target.removeEventListener("touchcancel", on_touch_end);
        target.removeEventListener("touchend", on_touch_end);
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
        target.addEventListener("contextmenu", prevent_default);

        input.dispose = () => null;
      };
    }

    return input;
  }

  mode: "pc" | "mobile" = "pc";

  dispose = (): void => void 0;

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

  private _layout: UILayout | undefined;
  private _movement: PointerInfo | undefined;
  private _touch: PointerInfo | undefined;

  movement(): undefined | PointerInfo {
    return this._movement !== undefined && this._touch === undefined ? this._movement : undefined;
  }

  touch(): undefined | PointerInfo {
    return this._touch !== undefined ? this._touch : undefined;
  }

  set_layout(layout: UILayout | undefined) {
    this._layout = layout;
    // reset Pointer properties
  }

  private start_movement(identifier: PointerInfo["identifier"]) {
    this._movement = this.#movement;
    this.#movement.identifier = identifier;
  }

  private stop_movement() {
    this._movement = undefined;
    this.#movement.identifier = NaN;
  }

  private start_touch(identifier: PointerInfo["identifier"]) {
    this._touch = this.#touch;
    this.#touch.identifier = identifier;
  }

  private stop_touch() {
    this._touch = undefined;
    this.#touch.identifier = NaN;
  }

  static update_current_values(input: Input, event: { pageX: number; pageY: number }, target: PointerInfo) {
    const ctx = input.context_info;
    const screen_x = ((event.pageX - ctx.container_offset_x) / ctx.container_width) * ctx.world_width;
    const screen_y = ((event.pageY - ctx.container_offset_y) / ctx.container_height) * ctx.world_height;
    const current_x = ctx.camera_x + (screen_x - ctx.world_width / 2) + ctx.camera_width / 2;
    const current_y = ctx.camera_y + (screen_y - ctx.world_height / 2) + ctx.camera_height / 2;

    const direction_x =
      typeof target.identifier === "number" ? target.screen_click_x - screen_x : ctx.world_width / 2 - screen_x;
    const direction_y =
      typeof target.identifier === "number" ? target.screen_click_y - screen_y : ctx.world_height / 2 - screen_y;

    target.direction_x = direction_x;
    target.direction_y = direction_y;
    target.screen_current_x = screen_x;
    target.screen_current_y = screen_y;
    target.current_x = current_x;
    target.current_y = current_y;
  }

  static get_on_mouse_down(input: Input) {
    return (event: MouseEvent) => {
      event.preventDefault();

      let movement = false;
      if (event.button === 0) {
        movement = true;
        input.start_movement("right");
      } else if (event.button === 2) {
        input.start_touch("left");
      } else {
        return;
      }

      const target = (event.button === 0 ? input.movement() : input.touch())!;

      this.update_current_values(input, event, target);

      target.click_x = target.current_x;
      target.click_y = target.current_y;
      target.screen_click_x = target.screen_current_x;
      target.screen_click_y = target.screen_current_y;

      if (movement === true && input._layout !== undefined) {
        input._layout.lcw.test_collision(
          new SSCDCircle(new SSCDVector(target.screen_click_x, target.screen_click_y), 2),
          undefined,
          () => {
            input.stop_movement();
            input.start_touch("right");
            return false;
          }
        );
      }
    };
  }

  static get_on_mouse_up(input: Input) {
    return (event: MouseEvent) => {
      event.preventDefault();

      const touch = input.touch();
      if (event.button === 0) {
        if (touch?.identifier === "right") {
          input.stop_touch();
        } else {
          input.stop_movement();
        }
      } else if (event.button === 2) {
        input.stop_touch();
      }
    };
  }

  static get_on_mouse_move(input: Input) {
    return (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const movement = input._movement;
      if (movement !== undefined) {
        this.update_current_values(input, event, movement);
      }

      const touch = input._touch;
      if (touch !== undefined) {
        this.update_current_values(input, event, touch);
      }
    };
  }
}

class PointerInfo {
  identifier: number | "left" | "right" = NaN;

  screen_click_y = 0;
  screen_click_x = 0;

  screen_current_x = 0;
  screen_current_y = 0;

  direction_x = 0;
  direction_y = 0;

  current_x = 0;
  current_y = 0;

  click_x = 0;
  click_y = 0;
}
