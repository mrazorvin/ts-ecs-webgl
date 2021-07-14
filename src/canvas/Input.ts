import { Resource } from "@mr/ecs/World";

export class Input extends Resource {
  static create(target: HTMLElement) {
    const input = new Input();

    input.container_offset_x = target.offsetLeft;
    input.container_offset_y = target.offsetTop;

    target.addEventListener("mousedown", input.on_touch_start);
    target.addEventListener("mouseup", input.on_touch_end);
    target.addEventListener("mousemove", input.on_touch_move);

    input.clean = () => {
      target.removeEventListener("mousedown", input.on_touch_start);
      target.removeEventListener("mouseup", input.on_touch_end);
      target.removeEventListener("mousemove", input.on_touch_move);
    };

    return input;
  }

  clean = (): void => void 0;

  container_offset_x = 0;
  container_offset_y = 0;

  container_width = 0;
  container_height = 0;

  camera_x = 0;
  camera_y = 0;

  world_width = 0;
  world_height = 0;

  current_x = 0;
  current_y = 0;

  click_x = 0;
  click_y = 0;

  world_click_x = 0;
  world_click_y = 0;

  left_button = false;
  right_button = false;

  constructor() {
    super();
  }

  on_touch_start = (event: MouseEvent) => {
    if (event.button === 0) {
      this.left_button = true;
      this.right_button = false;
    }

    if (event.button === 2) {
      this.left_button = true;
      this.right_button = false;
    }

    const click_x =
      ((event.pageX - this.container_offset_x) / this.container_width) *
      this.world_width;
    const click_y =
      ((event.pageY - this.container_offset_y) / this.container_height) *
      this.world_height;
    this.click_x = click_x;
    this.click_y = click_y;

    this.world_click_x = click_x + this.camera_x;
    this.world_click_y = click_y + this.camera_y;
  };

  on_touch_end = (event: MouseEvent) => {
    this.left_button = false;
    this.right_button = false;
  };

  on_touch_move = (event: MouseEvent) => {
    this.current_x =
      ((event.pageX - this.container_offset_x) / this.container_width) *
      this.world_width;
    this.current_y =
      ((event.pageY - this.container_offset_y) / this.container_height) *
      this.world_height;
  };
}
