import { main_world } from "@mr/canvas/MainWorld";
import { WebGL } from "src/canvas/Render/WebGL";
import { LoopInfo, RafScheduler, q, sys } from "src/ecs/World";
import { Screen } from "src/canvas/Screen";
import { t } from "src/canvas/Render/WebGLUtils";
import { Context, ContextID } from "src/canvas/Render/Context";
import { Transform3D } from "./Transform";
import { Input3D } from "./Input3D";
import { Camera3D } from "./Camera3D";
import { GridShader, GRID_SHADER, GridMesh, GRID_MESH, Grid } from "./Grid";
import { QUAD_MESH, QUAD_SHADER, Quad, QuadMesh, QuadShader } from "./Quad";

const scheduler = new RafScheduler(main_world);
const gl = WebGL.setup(document, "app");
const context = new ContextID();

main_world.resource(Input3D.create(gl.canvas));
main_world.resource(gl);
main_world.resource(new Camera3D());
main_world.resource(new Screen());

const resize_system = sys([WebGL, Screen, Input3D, Camera3D], (_, ctx, screen, input, camera) => {
	const { width, height, canvas_w, canvas_h } = t.size(ctx.gl, "100%", "100%");

	screen.width = width;
	screen.height = height;

	const input_ctx = input.context_info;

	input_ctx.container_offset_x = gl.canvas.offsetLeft;
	input_ctx.container_offset_y = gl.canvas.offsetTop;
	input_ctx.container_width = canvas_w;
	input_ctx.container_height = canvas_h;

	camera.transform.position.set(0, 1, 3);
	camera.set_perspective(screen);

	ctx.create_context(context, { width, height }, Context.create);

	ctx.gl.cullFace(ctx.gl.BACK);
	ctx.gl.frontFace(ctx.gl.CCW);
	ctx.gl.enable(ctx.gl.DEPTH_TEST);
	ctx.gl.enable(ctx.gl.CULL_FACE);
	ctx.gl.depthFunc(ctx.gl.LEQUAL);
	ctx.gl.blendFunc(ctx.gl.SRC_ALPHA, ctx.gl.ONE_MINUS_SRC_ALPHA);
});
window.onresize = () => main_world.system_once(resize_system);
main_world.system_once(resize_system);

/**
 * Grid init & QUad init
 */
main_world.system_once(
	sys([WebGL, Screen], (world, ctx) => {
		ctx.create_mesh(GridMesh.create, { id: GRID_MESH });
		ctx.create_shader(GridShader.create, { id: GRID_SHADER });

		ctx.create_mesh(QuadMesh.create, { id: QUAD_MESH });
		ctx.create_shader(QuadShader.create, { id: QUAD_SHADER });

		main_world.entity([Transform3D.create(world), Grid.create(world)]);

		for (let i = 0; i < 10; i++) {
			const transform = Transform3D.create(world);
			main_world.entity([transform, Quad.create(world)]);
			transform.position.x = -2.5 + Math.random() * 5;
			transform.position.y = -2.5 + Math.random() * 5;
			transform.position.z = 2.5 - Math.random() * 5;
			transform.rotation.z = 360 * Math.random();
			transform.rotation.y = 360 * Math.random();
			transform.rotation.x = 360 * Math.random();

			transform.update();
		}
	}),
);

/**
 * Camera movement
 */
main_world.system(
	sys([Input3D, Camera3D, Screen], (_, input, camera, screen) => {
		const pointer = input.main_pointer_info();
		if (pointer != null) {
			const ROTATE_RATE = -300;
			const PAN_RATE = 5;

			const deltaX = pointer.screen_current_x - pointer.screen_prev_x;
			const deltaY = pointer.screen_current_y - pointer.screen_prev_y;

			if (pointer.shiftKey) {
				camera.transform.rotation.x += deltaX * (ROTATE_RATE / screen.width);
				camera.transform.rotation.y += deltaY * (ROTATE_RATE / screen.height);
			} else {
				camera.pan_x(-deltaX * (PAN_RATE / screen.width));
				camera.pan_y(deltaY * (PAN_RATE / screen.height));
			}
		}

		if (input.wheel_delta() !== 0) {
			const ZOOM_RATE = 200;
			camera.pan_z((input.wheel_delta() * ZOOM_RATE) / screen.height);
		}
	}),
);

/**
 * Grid render
 */
main_world.system(
	sys([WebGL, Camera3D], (world, ctx, camera) => {
		const main_ctx = ctx.context.get(context);
		if (main_ctx === undefined) return;
		t.buffer(ctx.gl, main_ctx);

		camera.update();

		q.run(world, q.id("axes") ?? q([Transform3D, Grid]), (_, transform) => {
			const shader = ctx.shaders.get(GRID_SHADER);
			const mesh = ctx.meshes.get(GRID_MESH);
			if (mesh instanceof GridMesh && shader instanceof GridShader) {
				shader.info.use(
					{
						uniforms: {
							u_ProjectionTransform: camera.project_mat4,
							u_CameraTransform: camera.view_ma4,
							"u_Color[0]": new Float32Array([...[0.8, 0.8, 0.8], ...[1, 0, 0], ...[0, 1, 0], ...[0, 0, 1]]),
						},
						mesh,
					},
					(gl) => {
						gl.bindBuffer(gl.ARRAY_BUFFER, mesh.data_buffer);
						gl.bufferData(gl.ARRAY_BUFFER, transform.mat4.raw, gl.DYNAMIC_DRAW);
					},
				);
			}

			q.run(world, q.id("sprite") ?? q([Transform3D, Quad]), (_, transform) => {
				const shader = ctx.shaders.get(QUAD_SHADER);
				const mesh = ctx.meshes.get(QUAD_MESH);

				if (mesh instanceof QuadMesh && shader instanceof QuadShader) {
					shader.info.use({
						uniforms: {
							u_Transform: transform.mat4.raw,
							u_ProjectionTransform: camera.project_mat4,
							u_CameraTransform: camera.view_ma4,
						},
						mesh,
					});
				}
			});
		});
	}),
);

// =============
// == DISPOSE ==
// =============

main_world.system(
	sys([WebGL, Input3D], (_, ctx, input) => {
		// dispose context frame info
		const main_context = ctx.context.get(context);
		if (main_context) {
			const { gl } = ctx;
			const { frame_buffer, width, height } = main_context;

			ctx.gl.bindFramebuffer(gl.READ_FRAMEBUFFER, frame_buffer);
			ctx.gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
			gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);

			main_context.need_clear = true;
		}

		// clearing input frame info
		input.clear_frame_info();
	}),
);

scheduler.start();
