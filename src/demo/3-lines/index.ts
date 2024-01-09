import { camera } from "src/canvas/Camera";
import { CollisionWorld, LocalCollisionWorld } from "src/canvas/CollisionWorld";
import { Input } from "@mr/canvas/Input";
import { main_world } from "@mr/canvas/MainWorld";
import { WebGL } from "src/canvas/Render/WebGL";
import { InitComponent, LoopInfo, RafScheduler, q, sys } from "src/ecs/World";
import { Screen } from "src/canvas/Screen";
import { t } from "src/canvas/Render/WebGLUtils";
import { world_transform_component } from "src/canvas/WorldView";
import { Context, ContextID } from "src/canvas/Render/Context";
import { Shader, ShaderID } from "src/canvas/Render/Shader";
import { ShaderGlobals } from "src/canvas/Render/ShaderGlobal";
import { Mesh, MeshID } from "src/canvas/Render/Mesh";
import { BaseTransform, Transform } from "src/canvas/Transform/Transform";
import { ComponentFactory } from "src/ecs/Component";

const scheduler = new RafScheduler(main_world);
const gl = WebGL.setup(document, "app");
const context = new ContextID();

main_world.resource(Input.create(gl.canvas));
main_world.resource(gl);
main_world.resource(camera);
main_world.resource(new CollisionWorld());
main_world.resource(new LocalCollisionWorld());
main_world.resource(new Screen());

// this value must somehow refer to 32x32 grid size, for simplification reason
const ROWS = navigator.maxTouchPoints > 1 ? 80 : 160;

const resize_system = sys(
	[WebGL, Screen, Input],
	(world, ctx, screen, input) => {
		const { width, height, canvas_w, canvas_h } = t.size(
			ctx.gl,
			"100%",
			"100%",
		);
		const width_ratio = width / (height / ROWS);

		// all following code must be part of different contracts
		// there should be some kind of marker for RESIZE contract call
		// like behavior_start("RESIZE") && behavior_end("RESIZE");
		// in development mode on the end of systems, we will iterate over all contracts and check of they still valid
		// in production mode contracts will be no-op

		world_transform_component.scale(1 / width_ratio, -1 / ROWS);
		camera.transform.position(0, 0);

		ctx.create_context(context, { width, height }, Context.create);

		const input_ctx = input.context_info;

		input_ctx.container_offset_x = gl.canvas.offsetLeft;
		input_ctx.container_offset_y = gl.canvas.offsetTop;
		input_ctx.container_width = canvas_w;
		input_ctx.container_height = canvas_h;
		input_ctx.world_height = ROWS * 2;
		input_ctx.world_width = width_ratio * 2;
		screen.height = ROWS * 2;
		screen.width = width_ratio * 2;
		input_ctx.camera_width = camera.transform.width = width_ratio * 2;
		input_ctx.camera_height = camera.transform.height = ROWS * 2;
	},
);

window.onresize = () => main_world.system_once(resize_system);
main_world.system_once(resize_system);

// ---------------
// ---- MAIN -----
// ---------------

export class Sprite extends InitComponent({ use_pool: false }) {
	static create = ComponentFactory(Sprite, (prev) => prev ?? new Sprite());
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

	static create(gl: WebGL2RenderingContext): Mesh {
		const vao = gl.createVertexArray();
		gl.bindVertexArray(vao);

		if (vao == null) {
			throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
		}

		const x = 0;
		const y = 0;
		const width = 1;
		const height = 1;

		const lines = new Float32Array([
			...[x, y],
			...[x + width, y],
			...[x, y + height],

			...[x, y + height],
			...[x + width, y],
			...[x + width, y + height],
		]);

		const vertex = Mesh.attribute_buffer(gl, {
			array: lines,
			component_length: 2,
			attribute: ShaderGlobals.Attributes.a_Position,
		});

		const color_attr_position = 4;
		const attribute_transform_location = 5;

		const data_buffer = gl.createBuffer()!;
		const color_attrib_count = 1;
		const attributes_amount_for_mat3 = 3;
		const el_per_row_count_for_mat3 = 3;

		const stride =
			Float32Array.BYTES_PER_ELEMENT *
			(color_attrib_count +
				el_per_row_count_for_mat3 * attributes_amount_for_mat3);

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

		for (let i = 0; i < attributes_amount_for_mat3; i++) {
			const next_location = attribute_transform_location + i;
			gl.enableVertexAttribArray(next_location);
			// note the stride and offset
			const offset =
				Float32Array.BYTES_PER_ELEMENT *
				(i * el_per_row_count_for_mat3 + color_attrib_count);
			gl.vertexAttribPointer(
				next_location, // location
				el_per_row_count_for_mat3, // size (num values to pull from buffer per iteration)
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
			gl.TRIANGLE_STRIP,
			vao,
			{
				vertex,
				normal: null,
				uv: null,
				index: null,
			},
			{
				instances_count: 1,
				vertices_per_instaces: 6,
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
	in vec2 a_Position;
	layout(location = 4) in float a_Color;
	layout(location = 5) in mat3 a_Transform;

	uniform mat3 u_WorldTransform;
	uniform vec3 u_Color[4];

	out lowp vec4 in_Color;
	void main(void) {
		in_Color = vec4(u_Color[int(a_Color)], 1); 
		gl_Position = vec4(u_WorldTransform * a_Transform * (vec3(a_Position, 1)), 1);
	}
`;

main_world.system_once(
	sys([WebGL, Screen], (world, ctx, screen) => {
		ctx.create_mesh(MainMesh.create, { id: SCREEN_MESH });
		ctx.create_shader(MainShader.create, { id: SCREEN_SHADER });

		for (let i = 0; i < 21; i++) {
			const horizontal_line = Transform.create(world, {
				parent: BaseTransform.World,
				x: screen.width / 2,
				y: i < 20 ? (screen.height / 20) * i : screen.height - 1,
				scale_x: screen.width,
				scale_y: 0.5,
				width: 1,
				height: 1,
			});

			main_world.entity([
				horizontal_line,
				Sprite.create(world),
				Color.create(world, 2),
			]);
		}

		for (let i = 0; i < 21; i++) {
			const vertical_line = Transform.create(world, {
				parent: BaseTransform.World,
				x: i < 20 ? (screen.width / 20) * i : screen.width - 1,
				y: screen.height / 2,
				scale_x: 0.5,
				scale_y: screen.height,
				width: 1,
				height: 1,
			});

			main_world.entity([
				vertical_line,
				Sprite.create(world),
				Color.create(world, 3),
			]);
		}
	}),
);

main_world.system(
	sys([WebGL, LoopInfo], (world, ctx, loop) => {
		const main_ctx = ctx.context.get(context);
		if (main_ctx === undefined) return;
		t.buffer(ctx.gl, main_ctx);

		q.run(
			world,
			q.id("sprite") ?? q([Transform, Color, Sprite]),
			(_, transform, { color }) => {
				const sprite_transform = Transform.view(world, transform);
				const world_transform = Transform.view(
					world,
					world_transform_component,
				);

				const shader = ctx.shaders.get(SCREEN_SHADER);
				const mesh = ctx.meshes.get(SCREEN_MESH);
				if (mesh instanceof MainMesh && shader instanceof MainShader) {
					shader.info.use(
						{
							uniforms: {
								u_WorldTransform: world_transform.slice(0, 9),
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
							const data = new Float32Array(10);
							data.set(sprite_transform.subarray(0, 9), 1);
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
