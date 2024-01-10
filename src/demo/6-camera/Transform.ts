import { ComponentFactory, InitComponent } from "src/ecs/Component";
import { Mat4, Vec3 } from "./Math";
import { glMatrix } from "gl-matrix";

export class Transform3D extends InitComponent({ use_pool: false }) {
	static create = ComponentFactory(Transform3D, () => new Transform3D());

	constructor(
		// Transformations
		public position = new Vec3(0, 0, 0),
		public scale = new Vec3(1, 1, 1),
		public rotation = new Vec3(0, 0, 0),
		public mat4 = new Mat4(),
		public normal = new Float32Array(),

		// Direction
		public forward_vec4 = new Float32Array(4),
		public up_vec4 = new Float32Array(4),
		public right_vec4 = new Float32Array(4),
	) {
		super();
	}

	update() {
		// Order is important
		this.mat4
			.reset()
			.vec_translate(this.position)
			.rotateX(this.rotation.x * TO_RAD)
			.rotateZ(this.rotation.z * TO_RAD)
			.rotateY(this.rotation.y * TO_RAD)
			.vec_scale(this.scale);

		// Calc normal Mat4 without translate -> transpose -> inverse to Mat3
		Mat4.normal_mat3(this.normal, this.mat4.raw);

		this.update_direction();

		return this.mat4.raw;
	}

	update_direction() {
		Mat4.transform_to_vec4(this.forward_vec4, [0, 0, 1, 0], this.mat4.raw);
		Mat4.transform_to_vec4(this.up_vec4, [0, 1, 0, 0], this.mat4.raw);
		Mat4.transform_to_vec4(this.right_vec4, [1, 0, 0, 0], this.mat4.raw);

		return this;
	}

	reset() {
		this.position.set(0, 0, 0);
		this.scale.set(1, 1, 1);
		this.rotation.set(0, 0, 0);
	}
}

const TO_RAD = Math.PI / 180;