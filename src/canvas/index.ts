import { glMatrix, mat3, vec2 } from "gl-matrix";
import {
	EntityRef,
	LoopInfo,
	q,
	RafScheduler,
	sys,
	World,
} from "@mr/ecs/World";
import { SpriteMesh, SPRITE_MESH } from "./Assets/View/Sprite/Sprite.mesh";
import {
	SpriteShader,
	SPRITE_SHADER,
} from "./Assets/View/Sprite/Sprite.shader";
import { WebGL } from "./Render/WebGL";
import { Texture } from "./Render/Texture";
import { Sprite } from "./Sprite";
import { t } from "./Render/WebGLUtils";
import { BaseTransform, Transform } from "./Transform/Transform";
import { Context, ContextID } from "./Render/Context";
import { Screen } from "./Screen";
import { Input } from "./Input";

import { hero, Hero } from "./Hero";
import { camera, Camera, camera_transform } from "./Camera";
import { Movement } from "./Modification";
import { MapLoader } from "./Assets/Map/MapLoader";
import { main_world } from "./MainWorld";
import { world_transform_component } from "./WorldView";
import {
	CollisionShape,
	CollisionWorld,
	LocalCollisionWorld,
} from "./CollisionWorld";
import { SSCDRectangle, SSCDShape, SSCDVector } from "@mr/sscd";
import { Visible, visible } from "./Visible";
import { attack, joystick, joystick_handle } from "./Assets/UI";
import {
	DesktopUI,
	desktop_ui,
	MobileUI,
	mobile_ui,
	UI,
	UILayout,
	UIManager,
} from "./UI";
import { monsters } from "./Assets/Monsters";
import { Creature, creature } from "./Creature";
import { Static } from "./Static";
import { CreatureLayer, UILayer } from "./Layers";
import {
	LightGlobalShader,
	LIGHT_GLOBAL_SHADER,
} from "./Assets/World/Light/LightGlobal.shader";
import { SCREEN_MESH } from "./Assets/View/Screen/Screen.mesh";
import { Shader } from "./Render/Shader";
import { LightShader, LIGHT_SHADER } from "./Assets/World/Light/Light.shader";
import { ogre } from "./Assets/Monsters/Ogre";

glMatrix.setMatrixArrayType(Array);

const hero_assets = ogre;

// this value must somehow refer to 32x32 grid size, for simplification reason
const ROWS = navigator.maxTouchPoints > 1 ? 80 : 160;
const MAIN_CONTEXT = new ContextID();
const LIGHT_CONTEXT = new ContextID();

const scheduler = new RafScheduler(main_world);
const gl = WebGL.setup(document, "app");

main_world.resource(Input.create(gl.canvas));
main_world.resource(gl);
main_world.resource(camera);
main_world.resource(new CollisionWorld());
main_world.resource(new LocalCollisionWorld());

main_world.resource(new Screen());

const resize_system = sys([WebGL, Screen, Input], (_, ctx, screen, input) => {
	const { width, height, canvas_w, canvas_h } = t.size(ctx.gl, "100%", "100%");
	const width_ratio = width / (height / ROWS);

	// all following code must be part of different contracts
	// there should be some kind of marker for RESIZE contract call
	// like behavior_start("RESIZE") && behavior_end("RESIZE");
	// in development mode on the end of systems, we will iterate over all contracts and check of they still valid
	// in production mode contracts will be no-op

	world_transform_component.scale(1 / width_ratio, -1 / ROWS);
	camera.transform.position(0, 0);

	ctx.create_context(
		MAIN_CONTEXT,
		{ width, height, layers: 2 },
		Context.create,
	);
	ctx.create_context(LIGHT_CONTEXT, { width, height }, Context.create);

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
});

window.onresize = () => main_world.system_once(resize_system);
main_world.system_once(resize_system);

main_world.system_once(
	sys(
		[WebGL, Screen, Input, CollisionWorld],
		async (world, ctx, screen, input, sscd) => {
			t.clear(ctx.gl, [0, 0, 0, 0]);
			t.blend(ctx.gl);

			const mobile_layout = new UILayout();
			const desktop_layout = new UILayout();
			const layout_manager = new UIManager();
			layout_manager.layouts.set("desktop", desktop_layout);
			layout_manager.layouts.set("mobile", mobile_layout);

			ctx.create_mesh(SpriteMesh.create_rect, { id: SPRITE_MESH });
			ctx.create_shader(SpriteShader.create, { id: SPRITE_SHADER });
			ctx.create_shader(LightGlobalShader.create, { id: LIGHT_GLOBAL_SHADER });
			ctx.create_shader(LightShader.create, { id: LIGHT_SHADER });

			const attack_image = await Texture.load_image(attack);
			const attack_texture = ctx.create_texture(attack_image, Texture.create);
			const attack_frame = {
				uv_width: 1,
				uv_height: 1,
				x: 0,
				y: 0,
			};

			const desktop_position = new SSCDVector(
				screen.width / 2 - 16,
				screen.height - 32,
			);
			const desktop_attack = main_world.entity([
				Sprite.create(world, SPRITE_SHADER, attack_texture.id, attack_frame, 4),
				Transform.create(world, {
					parent: BaseTransform.World,
					x: desktop_position.x,
					y: desktop_position.y,
					height: attack_image.height,
					width: attack_image.width,
				}),
				desktop_ui,
			]);
			const desktop_shape = new SSCDRectangle<EntityRef>(
				desktop_position,
				new SSCDVector(32, 32),
			);
			desktop_shape.set_data(desktop_attack.ref);
			desktop_layout.lcw.add(desktop_shape);
			// new UI("attack_skill_slot", desktop_shape).attach(world, desktop_attack);

			const mobile_position = new SSCDVector(
				screen.width - 52,
				screen.height - 52,
			);
			const mobile_attack = main_world.entity([
				Sprite.create(
					world,
					SPRITE_SHADER,
					attack_texture.id,
					attack_frame,
					UILayer,
				),
				Transform.create(world, {
					parent: BaseTransform.World,
					x: mobile_position.x,
					y: mobile_position.y,
					height: attack_image.height,
					width: attack_image.width,
				}),
				mobile_ui,
			]);
			const mobile_shape = new SSCDRectangle<EntityRef>(
				mobile_position,
				new SSCDVector(32, 32),
			);
			mobile_shape.set_data(mobile_attack.ref);
			mobile_layout.lcw.add(mobile_shape);
			new UI("attack_skill_slot", mobile_shape).attach(world, mobile_attack);

			const joystick_handler_image = await Texture.load_image(joystick_handle);
			const joystick_handle_texture = ctx.create_texture(
				joystick_handler_image,
				Texture.create,
			);
			main_world.entity([
				Sprite.create(
					world,
					SPRITE_SHADER,
					joystick_handle_texture.id,
					{
						uv_width: 1,
						uv_height: 1,
						x: 0,
						y: 0,
					},
					UILayer,
				),
				Transform.create(world, {
					parent: BaseTransform.World,
					x: 0,
					y: 0,
					height: Math.floor(joystick_handler_image.height / 3),
					width: Math.floor(joystick_handler_image.width / 3),
				}),
				new UI("joystick_handle", undefined),
				mobile_ui,
			]);

			const joystick_image = await Texture.load_image(joystick);
			const joystick_texture = ctx.create_texture(
				joystick_image,
				Texture.create,
			);

			main_world.entity([
				Sprite.create(
					world,
					SPRITE_SHADER,
					joystick_texture.id,
					{
						uv_height: 1,
						uv_width: 1,
						x: 0,
						y: 0,
					},
					UILayer,
				),
				Transform.create(world, {
					parent: BaseTransform.World,
					x: 0,
					y: 0,
					height: joystick_image.height / 4,
					width: joystick_image.width / 4,
				}),
				new UI("joystick", undefined),
				mobile_ui,
			]);

			input.set_layout(
				navigator.maxTouchPoints > 1 ? mobile_layout : desktop_layout,
			);

			const hero_image = await Texture.load_image(hero_assets.sheet_src);
			const hero_n_image =
				hero_assets.sheet_n_src !== undefined
					? await Texture.load_image(hero_assets.sheet_n_src)
					: undefined;
			const hero_texture = ctx.create_texture(hero_image, (gl, image) =>
				Texture.create(gl, image, hero_n_image),
			);

			const transform = Transform.create(world, {
				parent: BaseTransform.Camera,
				x: 0,
				y: 0,
				height: hero_assets.atlas.grid_height,
				width: hero_assets.atlas.grid_width,
			});
			const hero_entity = main_world.entity([
				Sprite.create(
					world,
					SPRITE_SHADER,
					hero_texture.id,
					{
						uv_width: hero_assets.atlas.grid_width / hero_image.width,
						uv_height: hero_assets.atlas.grid_height / hero_image.height,
						x: 0,
						y: 0,
					},
					CreatureLayer,
				),
				transform,
				hero,
				Movement.create(world, 0, 0),
			]);

			const shape_manager = CollisionShape.manager(world);

			const shape = sscd.attach(
				world,
				hero_entity.ref,
				new SSCDRectangle(
					new SSCDVector(
						transform.x + transform.width / 2,
						transform.y + transform.width / 2,
					),
					new SSCDVector(transform.width, transform.width),
				),
			);

			shape_manager.attach(hero_entity, shape);

			let x = 16;
			let y = 16;
			for (const monster of monsters) {
				const monster_image = await Texture.load_image(monster.sheet_src);
				const monster_n_image =
					monster.sheet_n_src !== undefined
						? await Texture.load_image(monster.sheet_n_src)
						: undefined;
				const monster_texture = ctx.create_texture(monster_image, (gl, image) =>
					Texture.create(gl, image, monster_n_image),
				);

				const transform = Transform.create(world, {
					parent: BaseTransform.Camera,
					x: (x += 16),
					y: (y += 16),
					height: monster.atlas.grid_height,
					width: monster.atlas.grid_width,
				});
				const monster_entity = main_world.entity([
					Sprite.create(
						world,
						SPRITE_SHADER,
						monster_texture.id,
						{
							uv_width: monster.atlas.grid_width / monster_image.width,
							uv_height: monster.atlas.grid_height / monster_image.height,
							x: 0,
							y: 0,
						},
						CreatureLayer,
					),
					transform,
					creature,
				]);

				const shape = sscd.attach(
					world,
					monster_entity.ref,
					new SSCDRectangle(
						new SSCDVector(
							transform.x + transform.width / 2,
							transform.y + transform.width / 2,
						),
						new SSCDVector(transform.width, transform.width),
					),
				);
				shape_manager.attach(monster_entity, shape);
			}

			main_world.system_once(MapLoader);
		},
	),
);

const animation = {
	run: hero_assets.atlas.regions.filter((region) =>
		region.name.includes("run"),
	),
	idle: hero_assets.atlas.regions.filter((region) =>
		region.name.includes("idle"),
	),
	attack: hero_assets.atlas.regions.filter((region) =>
		region.name.includes("attack"),
	),
};

let selected_animation = "run";

// TODO: implement animation automat, move animation to ... ? Sprite or Animation component
let sec = 0;
let current_frame = 0;

main_world.system(
	sys(
		[CollisionWorld, LocalCollisionWorld, Camera],
		(world, sscd, lcw, camera) => {
			const manager = Visible.manager(world);

			sscd.world.test_collision<SSCDShape<EntityRef>>(
				new SSCDRectangle(
					new SSCDVector(
						-Math.min(camera.transform.x, 0),
						-Math.min(camera.transform.y, 0),
					),
					new SSCDVector(
						camera.transform.width + 64,
						camera.transform.height + 64,
					),
				),
				undefined,
				(shape) => {
					const entity = shape.get_data().entity!;
					manager.attach(entity, visible);
					lcw.world.add(shape);
				},
			);
		},
	),
);

main_world.system(
	sys([Input, LocalCollisionWorld], (world, input, lcw) => {
		q.run(
			world,
			q.id("move") ?? q([Transform, Movement, Hero]),
			(_, transform, modification) => {
				// make a static method from Modification class
				const movement = input.movement();
				if (movement !== undefined) {
					modification.target[0] = movement.direction_x;
					modification.target[1] = movement.direction_y;
				}
			},
		);
	}),
);

main_world.system(
	sys([Input, Camera], (world, input, camera) => {
		q.run(
			world,
			q.id("animation") ?? q([Transform, Movement, Hero]),
			(_, transform, modification) => {
				const movement = input.movement();

				// part of contract even if we don't move camera, we still need to call function at least once
				camera.set_position(
					transform.x - camera.transform.width / 2,
					transform.y - camera.transform.height / 2,
				);

				// part of contract camera position synchronization
				input.context_info.camera_x = -camera.transform.x;
				input.context_info.camera_y = -camera.transform.y;

				// those code some how connected to animation chain + movement behavior
				// think a better way to organize it
				if (
					!(
						modification.target[0] > -1 &&
						modification.target[0] < 1 &&
						modification.target[1] > -1 &&
						modification.target[1] < 1
					) &&
					movement !== undefined
				) {
					// instead of new buffer we could use buffer buffer switch, specify buffer switch little bit more
					const pos = [0, 0] as [number, number];
					vec2.normalize(pos, modification.target as [number, number]);
					const direction = pos[0];
					const new_position = vec2.subtract(
						pos,
						[transform.x, transform.y],
						pos,
					);
					transform.position(new_position[0]!, new_position[1]!);
					transform.scale(direction > 0 ? 1 : -1, 1);

					if (selected_animation !== "run") {
						selected_animation = "run";
						sec = 0;
					}
				} else {
					const touch = input.touch();

					if (touch !== undefined && selected_animation !== "attack") {
						selected_animation = "attack";
						sec = 0;
					} else if (touch === undefined && selected_animation !== "idle") {
						selected_animation = "idle";
						sec = 0;
					}
				}
			},
		);
	}),
);

main_world.system(
	sys([WebGL, LoopInfo, Input], (world, ctx, loop, input) => {
		const run_frames = animation[selected_animation as "run"];
		const time_per_frame = 1 / run_frames.length;

		sec += loop.time_delta;
		if (sec >= 1) sec = 0;
		current_frame = Math.round(sec / time_per_frame) % run_frames.length;
		const frame = run_frames[current_frame];

		q.run(world, q.id("animation") ?? q([Sprite, Hero]), (_, sprite) => {
			sprite.frame.x = frame?.rect[0]! / hero_assets.atlas.grid_width;
			sprite.frame.y = frame?.rect[1]! / hero_assets.atlas.grid_height;
		});
	}),
);

interface Tag {
	width: number;
	height: number;
	x: number;
	y: number;
	layer: number;
	texture: Texture.ID;
	transform: Transform;
	e_type: undefined | Static | Hero | Creature | UI;
	frame: {
		uv_width: number;
		uv_height: number;
		x: number;
		y: number;
	};
}

const default_transform = new Transform({
	x: 0,
	y: 0,
	height: 0,
	width: 0,
	parent: BaseTransform.None,
});
const default_frame = { uv_width: 0, uv_height: 0, x: 0, y: 0 };
const instanced_data = new Float32Array(9 * 1000);
const instanced_data_arrays = Array(1000)
	.fill(1)
	.map((_, i) => instanced_data.subarray(i * 9, i * 9 + 9));
const sprite_data = new Float32Array(8 * 1000);
const sprite_data_arrays = Array(1000)
	.fill(1)
	.map((_, i) => sprite_data.subarray(i * 8, i * 8 + 8));
const samplerArray: number[] = [];
const tagsCache = Array(1000)
	.fill(0)
	.map(
		(): Tag => ({
			x: 0,
			y: 0,
			width: 0,
			height: 0,
			layer: 0,
			texture: {} as Texture.ID,
			transform: default_transform,
			frame: default_frame,
			e_type: undefined,
		}),
	);
const taggedEntities: Tag[] = [];
const shadow_matrix = new Float32Array(10);
const light_matrix = new Float32Array(10);

function render_to_buffer(
	world: World,
	ctx: WebGL,
	shader: SpriteShader,
	mesh: SpriteMesh,
	entities: Tag[],
) {
	const gl = ctx.gl;
	const data = instanced_data;
	let idx = 0;
	let cache: { [key: string]: number } = {};
	let cache_size = 0;
	for (const tag of entities) {
		const texture_pos = cache[tag.texture.id];
		if (texture_pos === undefined) {
			if (cache_size === 15) {
				// render values
				gl.bindBuffer(gl.ARRAY_BUFFER, mesh.transform_buffer);
				gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

				gl.bindBuffer(gl.ARRAY_BUFFER, mesh.frame_buffer);
				gl.bufferData(gl.ARRAY_BUFFER, sprite_data, gl.DYNAMIC_DRAW);

				gl.uniform1iv(shader.location.Image, samplerArray);

				gl.drawArraysInstanced(
					gl.TRIANGLE_STRIP,
					0, // offset
					6, // num vertices per instance
					idx, // num instances
				);

				// reset loop values
				idx = 0;
				cache = {};
				cache_size = 0;
				samplerArray.length = 0;
			}

			const texture = ctx.textures.get(tag.texture)!;

			gl.activeTexture(gl.TEXTURE0 + cache_size);
			gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture.texture);

			samplerArray[cache_size] = cache_size;
			cache[tag.texture.id] = cache_size;
			cache_size += 1;
		}

		let shadow_data: undefined | Float32Array;
		let shadow_sprite: undefined | Float32Array;
		if (tag.e_type instanceof Hero || tag.e_type instanceof Creature) {
			shadow_data = instanced_data_arrays[idx]!;
			shadow_sprite = sprite_data_arrays[idx]!;
			idx++;
		}
		const instance_data = instanced_data_arrays[idx]!;
		const sprite = sprite_data_arrays[idx]!;
		const view = Transform.view(world, tag.transform);
		const frame = tag.frame;

		if (shadow_data !== undefined && shadow_sprite === undefined) {
			shadow_matrix.set(view);
			mat3.translate(shadow_matrix, shadow_matrix, [
				tag.width / 4.4,
				tag.height / 2.65,
			]);
			mat3.scale(shadow_matrix, shadow_matrix, [1 / 2, 1 / 2]);
			mat3.rotate(shadow_matrix, shadow_matrix, 0.1);

			shadow_matrix[0] *= 2;
			shadow_matrix[1] += 0.002;

			shadow_data[0] = shadow_matrix[0]!;
			shadow_data[1] = shadow_matrix[1]!;
			shadow_data[2] = shadow_matrix[2]!;
			shadow_data[3] = shadow_matrix[3]!;
			shadow_data[4] = shadow_matrix[4]!;
			shadow_data[5] = shadow_matrix[5]!;
			shadow_data[6] = shadow_matrix[6]!;
			shadow_data[7] = shadow_matrix[7]!;
			shadow_data[8] = shadow_matrix[8]!;

			shadow_sprite[0] = tag.width;
			shadow_sprite[1] = tag.height;
			shadow_sprite[2] = frame.uv_width;
			shadow_sprite[3] = frame.uv_height;
			shadow_sprite[4] = frame.x;
			shadow_sprite[5] = frame.y;
			shadow_sprite[6] = texture_pos ?? cache_size - 1;
			shadow_sprite[7] = 12; // TODO: replace this shit random number
		}

		instance_data[0] = view[0]!;
		instance_data[1] = view[1]!;
		instance_data[2] = view[2]!;
		instance_data[3] = view[3]!;
		instance_data[4] = view[4]!;
		instance_data[5] = view[5]!;
		instance_data[6] = view[6]!;
		instance_data[7] = view[7]!;
		instance_data[8] = view[8]!;

		sprite[0] = tag.width;
		sprite[1] = tag.height;
		sprite[2] = frame.uv_width;
		sprite[3] = frame.uv_height;
		sprite[4] = frame.x;
		sprite[5] = frame.y;
		sprite[6] = texture_pos ?? cache_size - 1;
		sprite[7] = tag.e_type instanceof Hero ? 1 : 0;

		idx++;
	}

	if (cache_size !== 0) {
		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.transform_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, mesh.frame_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, sprite_data, gl.DYNAMIC_DRAW);

		gl.uniform1iv(shader.location.Image, samplerArray);

		gl.drawArraysInstanced(
			gl.TRIANGLE_STRIP,
			0, // offset
			6, // num vertices per instance
			idx, // num instances
		);
	}
	samplerArray.length = 0;
}

function render_lights(
	world: World,
	ctx: WebGL,
	_: Context,
	world_view: Float32Array,
	camera_view: Float32Array,
) {
	const gl = ctx.gl;

	const light_ctx = ctx.context.get(LIGHT_CONTEXT);
	const light_shader = ctx.shaders.get(LIGHT_SHADER);
	const light_mesh = ctx.meshes.get(SPRITE_MESH);

	t.buffer(ctx.gl, light_ctx);

	if (light_ctx && light_shader instanceof LightShader && light_mesh) {
		q.run(world, q.id("light") ?? q([Transform, Creature]), (_, transform) => {
			gl.useProgram(light_shader.program);
			const light_transform = new Transform({
				width: 160,
				height: 160,
				x: transform.x + transform.width / 2 - 80,
				y: transform.y + transform.height / 2 - 80,
				parent: transform.meta.parent,
			});
			light_matrix.set(Transform.view(world, light_transform));
			gl.uniform2f(
				light_shader.location.Resolution,
				light_ctx.width,
				light_ctx.height,
			);
			gl.uniform2f(
				light_shader.location.WidthHeight,
				light_transform.width,
				light_transform.height,
			);
			gl.uniformMatrix3fv(
				light_shader.location.Transform,
				false,
				light_matrix.subarray(0, 9),
			);
			gl.uniformMatrix3fv(
				light_shader.location.WorldTransform,
				false,
				world_view.subarray(0, 9),
			);
			gl.uniformMatrix3fv(
				light_shader.location.CameraTransform,
				false,
				camera_view.subarray(0, 9),
			);
			Shader.render_mesh(gl, light_mesh);
			gl.useProgram(null);
		});
	}
}

main_world.system(
	sys([WebGL], (world, ctx) => {
		const main_ctx = ctx.context.get(MAIN_CONTEXT);
		if (main_ctx === undefined) return;

		const gl = ctx.gl;
		const shader = ctx.shaders.get(SPRITE_SHADER)! as SpriteShader;
		const mesh = ctx.meshes.get(SPRITE_MESH)! as SpriteMesh;

		let taggedEntitiesSize = 0;

		const collect_entities = (
			_: unknown,
			transform: Transform,
			sprite: Sprite,
			e_type: unknown,
		) => {
			const tag = tagsCache[taggedEntitiesSize]!;
			tag.width = transform.width;
			tag.height = transform.height;
			tag.x = transform.x;
			tag.y = transform.y;
			tag.layer = sprite.layer;
			tag.frame = sprite.frame;
			tag.texture = sprite.texture;
			tag.transform = transform;
			tag.e_type = e_type as undefined;
			taggedEntities[taggedEntitiesSize] = tag;
			taggedEntitiesSize += 1;
		};

		const world_view = Transform.view(world, world_transform_component);
		const camera_view = Transform.view(world, camera_transform);

		render_lights(world, ctx, main_ctx, world_view, camera_view);

		t.buffer(ctx.gl, main_ctx);

		q.run(
			world,
			q.id("render_creature") ?? q([Transform, Sprite, Creature, Visible]),
			collect_entities,
		);
		q.run(
			world,
			q.id("render_static") ?? q([Transform, Sprite, Static, Visible]),
			collect_entities,
		);
		q.run(
			world,
			q.id("render_hero") ?? q([Transform, Sprite, Hero]),
			collect_entities,
		);
		q.run(
			world,
			q.id("render") ?? q([Transform, Sprite, UI, DesktopUI]),
			collect_entities,
		);
		taggedEntities.length = taggedEntitiesSize;

		taggedEntities.sort((v1, v2) => {
			if (v1.layer !== v2.layer) return v1.layer > v2.layer ? 1 : -1;
			if (v1.y !== v2.y) return v1.y + v1.height > v2.y + v2.height ? 1 : -1;
			if (v1.x !== v2.x) return v1.x > v2.x ? 1 : -1;

			return 0;
		});

		gl.useProgram(shader.program);
		gl.uniformMatrix3fv(
			shader.location.WorldTransform,
			false,
			world_view.subarray(0, 9),
		);
		gl.uniformMatrix3fv(
			shader.location.CameraTransform,
			false,
			camera_view.subarray(0, 9),
		);
		gl.bindVertexArray(mesh.vao);
		render_to_buffer(world, ctx, shader, mesh, taggedEntities);
		gl.bindVertexArray(null);
		gl.useProgram(null);
	}),
);

let frame_buffer = new Float32Array(6);

main_world.system(
	sys([Input, WebGL], (world, input, ctx) => {
		const m_ctx = ctx.context.get(MAIN_CONTEXT);
		if (m_ctx === undefined) return;
		else t.buffer(ctx.gl, m_ctx);

		if (input.mode === "mobile") {
			q.run(
				world,
				q.id("render") ?? q([Sprite, Transform, UI, MobileUI]),
				(_, sprite, transform, ui) => {
					frame_buffer[0] = transform.width;
					frame_buffer[1] = transform.height;
					frame_buffer[2] = sprite.frame.uv_width;
					frame_buffer[3] = sprite.frame.uv_height;
					frame_buffer[4] = sprite.frame.x;
					frame_buffer[5] = sprite.frame.y;
					frame_buffer[6] = 0;
					frame_buffer[7] = 0;

					if (ui.id === "joystick" || ui.id === "joystick_handle") {
						// @ts-expect-error
						const movement = input._movement;
						if (movement !== undefined && ui.id === "joystick") {
							transform.position(
								movement.screen_click_x - transform.width / 2,
								movement.screen_click_y - transform.height / 2,
							);
							Sprite.render(
								ctx,
								sprite,
								Transform.view(world, transform),
								frame_buffer,
								1,
							);
						}

						if (movement !== undefined && ui.id === "joystick_handle") {
							transform.position(
								movement.screen_current_x - transform.width / 2,
								movement.screen_current_y - transform.height / 2,
							);
							Sprite.render(
								ctx,
								sprite,
								Transform.view(world, transform),
								frame_buffer,
								1,
							);
						}
					} else {
						Sprite.render(
							ctx,
							sprite,
							Transform.view(world, transform),
							frame_buffer,
							1,
						);
					}
				},
			);
		}
	}),
);

main_world.system(
	sys([WebGL, Camera], (_, ctx) => {
		const gl = ctx.gl;
		t.buffer(ctx.gl, undefined);

		const m_ctx = ctx.context.get(MAIN_CONTEXT);
		const light_ctx = ctx.context.get(LIGHT_CONTEXT);
		const shader = ctx.shaders.get(LIGHT_GLOBAL_SHADER);
		const mesh = ctx.meshes.get(SCREEN_MESH);
		if (shader instanceof LightGlobalShader && mesh && m_ctx && light_ctx) {
			gl.useProgram(shader.program);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D_ARRAY, m_ctx.texture);
			gl.uniform1i(shader.location.Image, 0);

			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D_ARRAY, light_ctx.texture);
			gl.uniform1i(shader.location.Lights, 1);

			Shader.render_mesh(gl, mesh);
			gl.useProgram(null);
		}
	}),
);

main_world.system(
	sys([WebGL], (_, ctx) => {
		const main_context = ctx.context.get(MAIN_CONTEXT);
		const light_context = ctx.context.get(LIGHT_CONTEXT);

		if (main_context && light_context) {
			// const { gl } = ctx;
			// const { frame_buffer, width, height } = main_context;
			//
			// ctx.gl.bindFramebuffer(gl.READ_FRAMEBUFFER, frame_buffer);
			// ctx.gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
			// gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);

			// part of contract
			light_context.need_clear = true;
			main_context.need_clear = true;
		}
	}),
);

main_world.system(
	sys([LocalCollisionWorld], (world, lcw) => {
		Visible.clear_collection(world);
		lcw.world.clear();
	}),
);

// TOOO: think about a way how to test code ?
// TODO: think about logging ?

scheduler.start();
