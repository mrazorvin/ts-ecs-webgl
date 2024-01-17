import { Resource } from "src/ecs/World";
import { Transform3D } from "./Transform";
import { Mat4 } from "./Math";
import { Screen } from "src/canvas/Screen";
import { glMatrix } from "gl-matrix";

export enum Camera3DMode {
	Free = 0,
	Orbit = 1,
}

export class Camera3D extends Resource {
	project_mat4 = new Float32Array(16);
	view_ma4 = new Float32Array(16);
	transform = new Transform3D();
	mode = Camera3DMode.Orbit;

	constructor(
		public fov = 45,
		public near = 0.1,
		public far = 100,
	) {
		super();
	}

	set_perspective(screen: Screen) {
		Mat4.perspective(this.project_mat4, this.fov, screen.width / screen.height, this.near, this.far);
	}

	pan_x(v: number) {
		this.update();

		if (this.mode === Camera3DMode.Free) {
			this.transform.position.x += this.transform.right_vec4[0] * v;
			this.transform.position.y += this.transform.right_vec4[1] * v;
			this.transform.position.z += this.transform.right_vec4[2] * v;
		}
	}

	pan_y(v: number) {
		this.update();

		if (this.mode === Camera3DMode.Free) {
			this.transform.position.x += this.transform.up_vec4[0] * v;
			this.transform.position.y += this.transform.up_vec4[1] * v;
			this.transform.position.z += this.transform.up_vec4[2] * v;
		}

		if (this.mode === Camera3DMode.Orbit) {
			this.transform.position.y += this.transform.up_vec4[1] * v;
		}
	}

	pan_z(v: number) {
		this.update();

		if (this.mode === Camera3DMode.Free) {
			this.transform.position.x += this.transform.forward_vec4[0] * v;
			this.transform.position.y += this.transform.forward_vec4[1] * v;
			this.transform.position.z += this.transform.forward_vec4[2] * v;
		}

		if (this.mode === Camera3DMode.Orbit) {
			this.transform.position.z += v;
		}
	}

	update() {
		if (this.mode === Camera3DMode.Free) {
			this.transform.mat4
				.reset()
				.vec_translate(this.transform.position)
				.rotate_x(glMatrix.toRadian(this.transform.rotation.x))
				.rotate_y(glMatrix.toRadian(this.transform.rotation.y));
		}

		if (this.mode === Camera3DMode.Orbit) {
			this.transform.mat4
				.reset()
				.rotate_x(glMatrix.toRadian(this.transform.rotation.x))
				.rotate_y(glMatrix.toRadian(this.transform.rotation.y))
				.vec_translate(this.transform.position);
		}

		this.transform.update_direction();

		Mat4.invert(this.view_ma4, this.transform.mat4.raw);
		return this.view_ma4;
	}

	mat4_without_translate() {
		const mat4 = new Float32Array(this.view_ma4);
		mat4[12] = mat4[13] = mat4[14] = 0;
		
		return mat4;
	}

	dispose() {}
}
