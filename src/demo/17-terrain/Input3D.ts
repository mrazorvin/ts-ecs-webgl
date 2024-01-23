import { Resource } from "@mr/ecs/World";
import { SSCDCircle, SSCDVector } from "@mr/sscd";

export class Input3D extends Resource {
	static create(target: HTMLElement) {
		const input = new Input3D();

		const prevent_default = (event: MouseEvent | TouchEvent) => {
			event.preventDefault();
		};

		input.mode = "pc";

		const on_mouse_down = Input3D.get_on_mouse_down(input);
		const on_mouse_move = Input3D.get_on_mouse_move(input);
		const on_mouse_up = Input3D.get_on_mouse_up(input);
		const on_wheel = Input3D.get_on_mouse_wheel(input);

		target.addEventListener("mousedown", on_mouse_down);
		target.addEventListener("mouseup", on_mouse_up);
		target.addEventListener("mousemove", on_mouse_move);
		target.addEventListener("contextmenu", prevent_default);
		// @ts-expect-error
		target.addEventListener("mousewheel", on_wheel);

		input.dispose = () => {
			target.removeEventListener("mousedown", on_mouse_down);
			target.removeEventListener("mouseup", on_mouse_up);
			target.removeEventListener("mousemove", on_mouse_move);
			// @ts-expect-error
			target.removeEventListener("mousewheel", on_wheel);
			target.removeEventListener("contextmenu", prevent_default);

			input.dispose = () => null;
		};

		return input;
	}

	mode = "pc" as const;

	dispose = (): void => void 0;

	context_info = {
		container_offset_x: 0,
		container_offset_y: 0,

		container_width: 0,
		container_height: 0,
	};

	#main_pointer_info = new PointerInfo();
	#wheel_delta = 0;

	private _main_pointer_info: PointerInfo | undefined;

	main_pointer_info(): undefined | PointerInfo {
		return this._main_pointer_info;
	}

	wheel_delta(): number {
		return this.#wheel_delta;
	}

	clear_frame_info() {
		this.#wheel_delta = 0;
		if (this.#main_pointer_info != null) {
			this.#main_pointer_info.screen_prev_x = this.#main_pointer_info.screen_current_x;
			this.#main_pointer_info.screen_prev_y = this.#main_pointer_info.screen_current_y;
		}
	}

	private start_main_pointer_movement(identifier: PointerInfo["identifier"]) {
		this._main_pointer_info = this.#main_pointer_info;
		this.#main_pointer_info.identifier = identifier;

		return this.#main_pointer_info;
	}

	private stop_main_pointer_movement() {
		this._main_pointer_info = undefined;
		this.#main_pointer_info.identifier = NaN;
	}

	static update_current_values(
		input: Input3D,
		event: { pageX: number; pageY: number; shiftKey: boolean },
		target: PointerInfo,
	) {
		const ctx = input.context_info;
		target.screen_prev_x = target.screen_current_x;
		target.screen_prev_y = target.screen_current_y;
		target.screen_current_x = event.pageX - ctx.container_offset_x;
		target.screen_current_y = event.pageY - ctx.container_offset_y;
		target.shiftKey = event.shiftKey;
	}

	static get_on_mouse_wheel(input: Input3D) {
		return (event: WheelEvent) => {
			input.#wheel_delta =
				// @ts-expect-error
				event.wheelDelta > 0 ? 1 : event.wheelDelta < 0 ? -1 : 0;
		};
	}

	static get_on_mouse_down(input: Input3D) {
		return (event: MouseEvent) => {
			event.preventDefault();

			if (event.button === 0) {
				const target = input.start_main_pointer_movement("right");
				this.update_current_values(input, event, target);
				target.screen_init_x = target.screen_current_x;
				target.screen_init_y = target.screen_current_y;
				target.screen_prev_x = target.screen_current_x;
				target.screen_prev_y = target.screen_current_y;
			} else {
				return;
			}
		};
	}

	static get_on_mouse_up(input: Input3D) {
		return (event: MouseEvent) => {
			event.preventDefault();

			if (event.button === 0) {
				input.stop_main_pointer_movement();
			}
		};
	}

	static get_on_mouse_move(input: Input3D) {
		return (event: MouseEvent) => {
			event.preventDefault();
			event.stopPropagation();

			const pointer_info = input._main_pointer_info;
			if (pointer_info !== undefined) {
				this.update_current_values(input, event, pointer_info);
			}
		};
	}
}

class PointerInfo {
	identifier: number | "left" | "right" = NaN;

	screen_current_x = 0;
	screen_current_y = 0;

	screen_prev_x = 0;
	screen_prev_y = 0;

	screen_init_x = 0;
	screen_init_y = 0;

	shiftKey = false;
}
