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

	static render(
		ctx: WebGL,
		world_transform: Float32Array,
		sprite_transform: Float32Array,
	) {
		const shader = ctx.shaders.get(SCREEN_SHADER);
		const mesh = ctx.meshes.get(SCREEN_MESH);
		const gl = ctx.gl;

		if (mesh instanceof MainMesh && shader instanceof MainShader) {
			shader.info.use(
				{
					uniforms: {
						u_WorldTransform: world_transform,
						u_SpriteTransform: sprite_transform,
					},
					vao: mesh.vao,
				},
				() => {
					gl.drawArraysInstanced(
						gl.TRIANGLE_STRIP,
						0, // offset
						6, // num vertices per instance
						1, // num instances
					);
				},
			);
		}
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}

export const SCREEN_MESH = new MeshID();

export class MainMesh extends Mesh {
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

		const rectangle = new Float32Array([
			...[x, y],
			...[x + width, y],
			...[x, y + height],

			...[x, y + height],
			...[x + width, y],
			...[x + width, y + height],
		]);

		const vertex = Mesh.attribute_buffer(gl, {
			array: rectangle,
			component_length: 2,
			attribute: ShaderGlobals.Attributes.a_Position,
		});

		gl.bindVertexArray(null);
		gl.bindBuffer(gl.ARRAY_BUFFER, null);

		const rect = new MainMesh(gl.TRIANGLES, vao, {
			vertex,
			normal: null,
			uv: null,
			index: null,
		});

		return rect;
	}

	dispose(gl: WebGL2RenderingContext) {
		this.default_dispose(gl);
	}
}

const fragment = `#version 300 es
	precision mediump float;

	out vec4 o_Color;
	void main(void) {
		o_Color = vec4(1, 1, 1, 1);
	}
`;

const vertext = `#version 300 es
	in vec2 a_Position;

	uniform mat3 u_SpriteTransform;
	uniform mat3 u_WorldTransform;

	void main(void) {
		gl_Position = vec4(u_WorldTransform * u_SpriteTransform * (vec3(a_Position, 1)), 1);
	}
`;

main_world.system_once(
	sys([WebGL], (world, ctx) => {
		ctx.create_mesh(MainMesh.create, { id: SCREEN_MESH });
		ctx.create_shader(MainShader.create, { id: SCREEN_SHADER });

		const transform = Transform.create(world, {
			parent: BaseTransform.World,
			x: 45,
			y: 45,
			scale_x: 32,
			scale_y: 32,
			width: 1,
			height: 1,
			rotation: 45,
		});

		main_world.entity([transform, Sprite.create(world)]);
	}),
);

let rotation = 0;

main_world.system(
	sys([WebGL, LoopInfo], (world, ctx, loop) => {
		const main_ctx = ctx.context.get(context);
		if (main_ctx === undefined) return;
		t.buffer(ctx.gl, main_ctx);

		q.run(world, q.id("sprite") ?? q([Transform, Sprite]), (_, transform) => {
			rotation += loop.time_delta;
			transform.rotate(
				transform.rotation + loop.time_delta * 80 > 360
					? 0
					: transform.rotation + loop.time_delta * 80,
			);
			transform.position(
				200 + 80 * Math.sin(rotation),
				160 + 80 * Math.cos(rotation),
			);

			const sprite_transform = Transform.view(world, transform);
			const world_transform = Transform.view(world, world_transform_component);

			MainShader.render(
				ctx,
				world_transform.slice(0, 9),
				sprite_transform.slice(0, 9),
			);
		});
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
