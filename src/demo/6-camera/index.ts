import { camera } from "src/canvas/Camera";
import { CollisionWorld, LocalCollisionWorld } from "src/canvas/CollisionWorld";
import { Input } from "@mr/canvas/Input";
import { main_world } from "@mr/canvas/MainWorld";
import { WebGL } from "src/canvas/Render/WebGL";
import {
	InitComponent,
	LoopInfo,
	RafScheduler,
	Scheduler,
	q,
	sys,
} from "src/ecs/World";
import { Screen } from "src/canvas/Screen";
import { t } from "src/canvas/Render/WebGLUtils";
import { world_transform_component } from "src/canvas/WorldView";
import { Context, ContextID } from "src/canvas/Render/Context";
import { Shader, ShaderID } from "src/canvas/Render/Shader";
import { ShaderGlobals } from "src/canvas/Render/ShaderGlobal";
import { Mesh, MeshID } from "src/canvas/Render/Mesh";
import { BaseTransform, Transform } from "src/canvas/Transform/Transform";
import { ComponentFactory } from "src/ecs/Component";
import { Transform3D } from "./Transform";
import { Vec3 } from "./Math";

const scheduler = new RafScheduler(main_world);
const gl = WebGL.setup(document, "app");
const context = new ContextID();

main_world.resource(Input.create(gl.canvas));
main_world.resource(gl);
main_world.resource(camera);
main_world.resource(new CollisionWorld());
main_world.resource(new LocalCollisionWorld());
main_world.resource(new Screen());

const world_transform_3d = new Transform3D(
	new Vec3(-1, 1, 0),
	new Vec3(2, -2, 1),
);

const resize_system = sys([WebGL, Screen, Input], (_, ctx, screen) => {
	const { width, height } = t.size(ctx.gl, "100%", "100%");

	// world_transform_3d.scale = new Vec3(2 / width, -2 / height, 1);
	world_transform_3d.update();

	screen.width = width;
	screen.height = height;

	ctx.create_context(context, { width, height }, Context.create);
});

window.onresize = () => main_world.system_once(resize_system);
main_world.system_once(resize_system);

// ---------------
// ---- MAIN -----
// ---------------

export class Grid extends InitComponent({ use_pool: false }) {
	static create = ComponentFactory(Grid, (prev) => prev ?? new Grid());
}

export class Color extends InitComponent({ use_pool: false }) {
	static create = ComponentFactory(Color, (_, color) => new Color(color));
	constructor(public color: 0 | 1 | 2 | 3) {
		super();
	}
}

export const SCREEN_SHADER = new ShaderID();

export class MainShader extends Shader {
	info!: t.ProgramInfo;

	static create(gl: WebGL2RenderingContext) {
		const { program, info } = t.program(
			gl,
			[t.shader(gl, fragment, "FRAGMENT"), t.shader(gl, vertext, "VERTEX")],
			{
				layout_attributes: {
					[ShaderGlobals.Attributes.a_Position]: ShaderGlobals.a_Position,
					[ShaderGlobals.Attributes.a_Transform]:
						ShaderGlobals.a_Transformation,
				},
			},
		);

		const shader = new MainShader(program);
		shader.info = info;

		return shader;
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}

export const SCREEN_MESH = new MeshID();

export class MainMesh extends Mesh {
	data_buffer!: WebGLBuffer;

	static create(gl: WebGL2RenderingContext) {
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		if (vao == null) {
			throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
		}

		const x = 0;
		const y = 0;
		const width = 1;
		const height = 1;
		const z = 1;

		const vertical_lines: number[] = [];
		const horizontal_lines: number[] = [];
		for (let i = 0; i < 20; i++) {
			vertical_lines.push(
				...[(width / 20) * i, 0, z],
				...[(width / 20) * i, height, z],
			);
			horizontal_lines.push(
				...[0, (height / 20) * i, z],
				...[width, (height / 20) * i, z],
			);
		}

		const lines = new Float32Array([...vertical_lines, ...horizontal_lines]);

		const vertex = Mesh.attribute_buffer(gl, {
			array: lines,
			component_length: 3,
			attribute: ShaderGlobals.Attributes.a_Position,
		});

		const color_attr_position = 4;
		const attribute_transform_location = 5;

		const data_buffer = gl.createBuffer()!;
		const color_attrib_count = 1;
		const attributes_amount_for_mat4 = 4;
		const el_per_row_count_for_mat4 = 4;

		const stride =
			Float32Array.BYTES_PER_ELEMENT *
			(color_attrib_count +
				el_per_row_count_for_mat4 * attributes_amount_for_mat4);

		gl.bindBuffer(gl.ARRAY_BUFFER, data_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, stride, gl.STATIC_DRAW)!;

		gl.enableVertexAttribArray(color_attr_position);
		gl.vertexAttribPointer(
			color_attr_position,
			color_attrib_count,
			gl.FLOAT,
			false,
			stride,
			// start of buffer
			Float32Array.BYTES_PER_ELEMENT * 0,
		);
		gl.vertexAttribDivisor(color_attr_position, 1);

		for (let i = 0; i < attributes_amount_for_mat4; i++) {
			const next_location = attribute_transform_location + i;
			gl.enableVertexAttribArray(next_location);
			// note the stride and offset
			const offset =
				Float32Array.BYTES_PER_ELEMENT *
				(i * el_per_row_count_for_mat4 + color_attrib_count);
			gl.vertexAttribPointer(
				next_location, // location
				el_per_row_count_for_mat4, // size (num values to pull from buffer per iteration)
				gl.FLOAT, // type of data in buffer
				false, // normalize
				stride, // stride, num bytes to advance to get to next set of values
				offset, // offset in buffer
			);
			// this line says this attribute only changes for each 1 instance
			gl.vertexAttribDivisor(next_location, 1);
		}

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		const mesh = new MainMesh(
			gl.LINES as never,
			vao,
			{
				vertex,
				normal: null,
				uv: null,
				index: null,
			},
			{
				instances_count: 1,
				vertices_per_instaces: lines.length / 2,
			},
		);

		mesh.data_buffer = data_buffer;

		return mesh;
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}

const fragment = `#version 300 es
	precision mediump float;

	in vec4 in_Color;
	out vec4 o_Color;
	void main(void) {
		o_Color = in_Color;
	}
`;

const vertext = `#version 300 es
	in vec3 a_Position;
	layout(location = 4) in float a_Color;
	layout(location = 5) in mat4 a_Transform;

	uniform mat4 u_WorldTransform;
	uniform vec3 u_Color[4];

	out lowp vec4 in_Color;
	void main(void) {
		in_Color = vec4(u_Color[int(a_Color)], 1); 
		gl_Position = vec4(u_WorldTransform * a_Transform * vec4(a_Position, 1));
	}
`;

main_world.system_once(
	sys([WebGL, Screen], (world, ctx) => {
		ctx.create_mesh(MainMesh.create, { id: SCREEN_MESH });
		ctx.create_shader(MainShader.create, { id: SCREEN_SHADER });

		main_world.entity([
			Transform3D.create(world),
			Grid.create(world),
			Color.create(world, 2),
		]);
	}),
);

main_world.system_once(
	sys([LoopInfo], (world, loop) => {
		q.run(world, q.id("sprite") ?? q([Transform3D, Grid]), (_, transform) => {
			transform.rotation = new Vec3(0, 0, 180);
			transform.update();
		});
	}),
);

main_world.system(
	sys([WebGL, LoopInfo], (world, ctx, loop) => {
		const main_ctx = ctx.context.get(context);
		if (main_ctx === undefined) return;
		t.buffer(ctx.gl, main_ctx);

		q.run(
			world,
			q.id("sprite") ?? q([Transform3D, Color, Grid]),
			(_, transform, { color }) => {
				const shader = ctx.shaders.get(SCREEN_SHADER);
				const mesh = ctx.meshes.get(SCREEN_MESH);
				if (mesh instanceof MainMesh && shader instanceof MainShader) {
					shader.info.use(
						{
							uniforms: {
								u_WorldTransform: world_transform_3d.mat4.raw.subarray(0, 16),
								"u_Color[0]": new Float32Array([
									...[0.8, 0.8, 0.8],
									...[1, 0, 0],
									...[0, 1, 0],
									...[0, 0, 1],
								]),
							},
							mesh,
						},
						(gl) => {
							gl.bindBuffer(gl.ARRAY_BUFFER, mesh.data_buffer);
							const data = new Float32Array(17);
							data.set(transform.mat4.raw.subarray(0, 16), 1);
							data[0] = color;
							gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
						},
					);
				}
			},
		);
	}),
);

// =============
// == DISPOSE ==
// =============

main_world.system(
	sys([WebGL], (_, ctx) => {
		const main_context = ctx.context.get(context);
		if (main_context) {
			const { gl } = ctx;
			const { frame_buffer, width, height } = main_context;

			ctx.gl.bindFramebuffer(gl.READ_FRAMEBUFFER, frame_buffer);
			ctx.gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
			gl.blitFramebuffer(
				0,
				0,
				width,
				height,
				0,
				0,
				width,
				height,
				gl.COLOR_BUFFER_BIT,
				gl.NEAREST,
			);

			main_context.need_clear = true;
		}
	}),
);

scheduler.start();
