import { glMatrix, vec2 } from "gl-matrix";
import { EntityRef, LoopInfo, q, RafScheduler, sys } from "@mr/ecs/World";
import { SpriteMesh, SPRITE_MESH } from "./Assets/View/Sprite/Sprite.mesh";
import { SpriteShader, SPRITE_SHADER } from "./Assets/View/Sprite/Sprite.shader";
import { WebGL } from "./Render/WebGL";
import { Texture } from "./Render/Texture";
import { Sprite } from "./Sprite";
import { t } from "./Render/WebGLUtils";
import { Transform } from "./Transform/Transform";
import { Context, ContextID } from "./Render/Context";
import { Screen } from "./Screen";

// @ts-ignore
import * as ogre_sprite from "url:./Assets/Monsters/Ogre/Ogre.png";
import * as atlas from "./Assets/Monsters/Ogre/Atlas.json";
import { PostPassShader, POST_PASS_SHADER } from "./Assets/View/PostPass/PostPass.shader";
import { PostPass, POST_PASS_CONTEXT } from "./Assets/View/PostPass/PostPass";
import { Input } from "./Input";
import { creature, Creature } from "./Creature";
import { Static } from "./Static";
import { camera, Camera, camera_entity } from "./Camera";
import { Movement } from "./Modification";
import { MapLoader } from "./Assets/Map/MapLoader";
import { main_world } from "./MainWorld";
import { world_transform, world_transform_component } from "./WorldView";
import { CollisionWorld, LocalCollisionWorld } from "./CollisionWorld";
import { SSCDRectangle, SSCDShape, SSCDVector } from "@mr/sscd";
import { Visible, visible } from "./Visible";
import { attack, joystick, joystick_handle } from "./Assets/UI";
import { DesktopUI, desktop_ui, MobileUI, mobile_ui, UI, UILayout, UIManager } from "./UI";

glMatrix.setMatrixArrayType(Array);

// this value must somehow refer to 32x32 grid size, for simplification reason
const ROWS = navigator.maxTouchPoints > 1 ? 80 : 160;
const BACKGROUND_CONTEXT = new ContextID();
const MONSTER_CONTEXT = new ContextID();

const scheduler = new RafScheduler(main_world);
const gl = WebGL.setup(document, "app");

main_world.resource(Input.create(gl.canvas));
main_world.resource(gl);
main_world.resource(camera);
main_world.resource(new CollisionWorld());
main_world.resource(new LocalCollisionWorld());

if (navigator.maxTouchPoints > 1) {
  window.addEventListener("touchstart", () => {
    document.documentElement.requestFullscreen({ navigationUI: "hide" });
    setTimeout(() => main_world.resource(new Screen()), 2000);
  });
} else {
  main_world.resource(new Screen());
}

const resize_system = sys([WebGL, Screen, Input], (_, ctx, screen, input) => {
  const { width, height } = t.size(ctx.gl, "100%", "100%");
  const width_ratio = width / (height / ROWS);

  // all following code must be part of different contracts
  // there should be some kind of marker for RESIZE contract call
  // like behavior_start("RESIZE") && behavior_end("RESIZE");
  // in development mode on the end of systems, we will iterate over all contracts and check of they still valid
  // in production mode contracts will be no-op

  world_transform_component.scale = new Float32Array([1 / width_ratio, -1 / ROWS]);

  ctx.create_context(BACKGROUND_CONTEXT, { width, height }, Context.create);
  ctx.create_context(MONSTER_CONTEXT, { width, height }, Context.create);
  ctx.create_context(POST_PASS_CONTEXT, { width, height, shader: POST_PASS_SHADER }, PostPass.create);

  const input_ctx = input.context_info;

  input_ctx.container_offset_x = gl.canvas.offsetLeft;
  input_ctx.container_offset_y = gl.canvas.offsetTop;
  input_ctx.container_width = width;
  input_ctx.container_height = height;
  input_ctx.world_height = ROWS * 2;
  input_ctx.world_width = width_ratio * 2;
  screen.height = ROWS * 2;
  screen.width = width_ratio * 2;
  input_ctx.camera_width = camera.transform.width = width_ratio * 2;
  input_ctx.camera_height = camera.transform.height = ROWS * 2;
  camera.transform.position = new Float32Array([0, 0]);
});

window.onresize = () => main_world.system_once(resize_system);
main_world.system_once(resize_system);

main_world.system_once(
  sys([WebGL, Screen, Input], async (world, ctx, screen, input) => {
    t.clear(ctx.gl, [0, 0, 0, 0]);
    t.blend(ctx.gl);

    const mobile_layout = new UILayout();
    const desktop_layout = new UILayout();
    const layout_manager = new UIManager();
    layout_manager.layouts.set("desktop", desktop_layout);
    layout_manager.layouts.set("mobile", mobile_layout);

    ctx.create_shader(PostPassShader.create, { id: POST_PASS_SHADER });
    ctx.create_mesh(SpriteMesh.create_rect, { id: SPRITE_MESH });
    ctx.create_shader(SpriteShader.create, { id: SPRITE_SHADER });

    const attack_image = await Texture.load_image(attack);
    const attack_texture = ctx.create_texture(attack_image, Texture.create);
    const attack_frame = {
      uv_width: 1,
      uv_height: 1,
      x: 0,
      y: 0,
    };

    const desktop_position = new SSCDVector(screen.width / 2 - 16, screen.height - 32);
    const desktop_attack = main_world.entity([
      Sprite.create(world, SPRITE_SHADER, attack_texture.id, attack_frame),
      Transform.create(world, {
        parent: world_transform.ref,
        position: new Float32Array([desktop_position.x, desktop_position.y]),
        height: attack_image.height,
        width: attack_image.width,
      }),
      desktop_ui,
    ]);
    const desktop_shape = new SSCDRectangle<EntityRef>(desktop_position, new SSCDVector(32, 32));
    desktop_shape.set_data(desktop_attack.ref);
    desktop_layout.lcw.add(desktop_shape);
    new UI("attack_skill_slot", desktop_shape).attach(world, desktop_attack);

    const mobile_position = new SSCDVector(screen.width - 52, screen.height - 52);
    const mobile_attack = main_world.entity([
      Sprite.create(world, SPRITE_SHADER, attack_texture.id, attack_frame),
      Transform.create(world, {
        parent: world_transform.ref,
        position: new Float32Array([mobile_position.x, mobile_position.y]),
        height: attack_image.height,
        width: attack_image.width,
      }),
      mobile_ui,
    ]);
    const mobile_shape = new SSCDRectangle<EntityRef>(mobile_position, new SSCDVector(32, 32));
    mobile_shape.set_data(mobile_attack.ref);
    mobile_layout.lcw.add(mobile_shape);
    new UI("attack_skill_slot", mobile_shape).attach(world, mobile_attack);

    const joystick_handler_image = await Texture.load_image(joystick_handle);
    const joystick_handle_texture = ctx.create_texture(joystick_handler_image, Texture.create);
    main_world.entity([
      Sprite.create(world, SPRITE_SHADER, joystick_handle_texture.id, {
        uv_width: 1 / 3,
        uv_height: 1 / 3,
        x: 0,
        y: 0,
      }),
      Transform.create(world, {
        parent: world_transform.ref,
        position: new Float32Array([0, 0]),
        height: Math.floor(joystick_handler_image.height / 3),
        width: Math.floor(joystick_handler_image.width / 3),
      }),
      new UI("joystick_handle", undefined),
      mobile_ui,
    ]);

    const joystick_image = await Texture.load_image(joystick);
    const joystick_texture = ctx.create_texture(joystick_image, Texture.create);

    main_world.entity([
      Sprite.create(world, SPRITE_SHADER, joystick_texture.id, {
        uv_height: 1 / 4,
        uv_width: 1 / 4,
        x: 0,
        y: 0,
      }),
      Transform.create(world, {
        parent: world_transform.ref,
        position: new Float32Array([0, 0]),
        height: joystick_image.height / 4,
        width: joystick_image.width / 4,
      }),
      new UI("joystick", undefined),
      mobile_ui,
    ]);

    input.set_layout(navigator.maxTouchPoints > 1 ? mobile_layout : desktop_layout);

    const ogre_image = await Texture.load_image(ogre_sprite);

    // entities initialization should be some how implemented from the JSON in separate system
    const ogre_texture = ctx.create_texture(ogre_image, Texture.create);

    console.warn(ogre_image.width);

    // TODO: inject entities in SubWorld instead of World
    main_world.entity([
      Sprite.create(world, SPRITE_SHADER, ogre_texture.id, {
        uv_width: atlas.grid_width / ogre_image.width,
        uv_height: atlas.grid_height / ogre_image.height,
        x: 0,
        y: 0,
      }),
      Transform.create(world, {
        parent: camera_entity.ref,
        position: new Float32Array([0, 0]),
        height: atlas.grid_height,
        width: atlas.grid_width,
      }),
      creature,
      Movement.create(world, 0, 0),
    ]);

    main_world.system_once(MapLoader);
  })
);

const animation = {
  run: atlas.regions.filter((region) => region.name.includes("run")),
  idle: atlas.regions.filter((region) => region.name.includes("idle")),
  attack: atlas.regions.filter((region) => region.name.includes("attack")),
};
let selected_animation = "run";

// TODO: implement animation automat, move animation to ... ? Sprite or Animation component
let sec = 0;
let current_frame = 0;

main_world.system(
  sys([CollisionWorld, LocalCollisionWorld, Camera], (world, sscd, lcw, camera) => {
    const manager = Visible.manager(world);

    sscd.world.test_collision<SSCDShape<EntityRef>>(
      new SSCDRectangle(
        new SSCDVector(-Math.min(camera.transform.position![0], 0), -Math.min(camera.transform.position![1], 0)),
        new SSCDVector(camera.transform.width + 64, camera.transform.height + 64)
      ),
      undefined,
      (shape) => {
        const entity = shape.get_data().entity!;
        manager.attach(entity, visible);
        lcw.world.add(shape);
      }
    );
  })
);

main_world.system(
  sys([Input, LocalCollisionWorld], (world, input, lcw) => {
    q.run(world, q.id("move") ?? q([Transform, Movement, Creature]), (_, transform, modification) => {
      // make a static method from Modification class
      const movement = input.movement();
      if (movement !== undefined) {
        modification.target[0] = movement.direction_x;
        modification.target[1] = movement.direction_y;
      }
    });
  })
);

const instanced_data = new Float32Array(9 * 1000);
const sprite_data = new Float32Array(6 * 1000);

main_world.system(
  sys([WebGL], (world, ctx) => {
    const bg_ctx = ctx.context.get(BACKGROUND_CONTEXT);
    if (bg_ctx === undefined) return;
    else t.buffer(ctx.gl, bg_ctx);

    let idx = 0;
    const data = instanced_data;
    let sprite: Sprite | undefined = undefined;

    q.run(world, q.id("render") ?? q([Transform, Sprite, Static, Visible]), (_, transform, _sprite) => {
      const view = Transform.view(main_world, transform);
      const frame = _sprite.frame;

      data[idx * 9 + 0] = view[0]!;
      data[idx * 9 + 1] = view[1]!;
      data[idx * 9 + 2] = view[2]!;
      data[idx * 9 + 3] = view[3]!;
      data[idx * 9 + 4] = view[4]!;
      data[idx * 9 + 5] = view[5]!;
      data[idx * 9 + 6] = view[6]!;
      data[idx * 9 + 7] = view[7]!;
      data[idx * 9 + 8] = view[8]!;
      sprite_data[idx * 6 + 0] = transform.width;
      sprite_data[idx * 6 + 1] = transform.height;
      sprite_data[idx * 6 + 2] = frame.uv_width;
      sprite_data[idx * 6 + 3] = frame.uv_height;
      sprite_data[idx * 6 + 4] = frame.x;
      sprite_data[idx * 6 + 5] = frame.y;

      idx++;

      sprite = _sprite;
    });

    if (sprite === undefined) return;

    Sprite.render(ctx, sprite, data.subarray(0, idx * 9), sprite_data.subarray(0, idx * 9), idx - 1);
  })
);

main_world.system(
  sys([Input, Camera], (world, input, camera) => {
    q.run(world, q.id("animation") ?? q([Transform, Movement, Creature]), (_, transform, modification) => {
      const movement = input.movement();

      // part of contract even if we don't move camera, we still need to call function at least once
      camera.set_position(
        transform.position[0] - camera.transform.width / 2,
        transform.position[1] - camera.transform.height / 2
      );

      // part of contract camera position synchronization
      if (camera.transform.position) {
        input.context_info.camera_x = -camera.transform.position[0];
        input.context_info.camera_y = -camera.transform.position[1];
      }

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
        const pos = new Float32Array(2);
        vec2.normalize(pos, modification.target as [number, number]);
        const direction = pos[0];
        transform.position = vec2.subtract(pos, transform.position, pos) as Float32Array;
        transform.scale = new Float32Array([direction > 0 ? 1 : -1, 1]);

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
    });
  })
);

let frame_buffer = new Float32Array(6);

main_world.system(
  sys([WebGL, LoopInfo, Input], (world, ctx, loop, input) => {
    const run_frames = animation[selected_animation as "run"];
    const time_per_frame = 1 / run_frames.length;

    sec += loop.time_delta;
    if (sec >= 1) sec = 0;
    current_frame = Math.round(sec / time_per_frame) % run_frames.length;
    const frame = run_frames[current_frame];

    const m_ctx = ctx.context.get(MONSTER_CONTEXT);
    if (m_ctx === undefined) return;
    else t.buffer(ctx.gl, m_ctx);

    q.run(world, q.id("render") ?? q([Sprite, Transform, Creature]), (_, sprite, transform) => {
      frame_buffer[0] = transform.width;
      frame_buffer[1] = transform.height;
      frame_buffer[2] = sprite.frame.uv_width;
      frame_buffer[3] = sprite.frame.uv_height;
      frame_buffer[4] = frame!.rect[0]! / atlas.grid_width;
      frame_buffer[5] = frame!.rect[1]! / atlas.grid_height;
      Sprite.render(ctx, sprite, Transform.view(world, transform), frame_buffer, 1);
    });
  })
);

main_world.system(
  sys([Input, WebGL], (world, input, ctx) => {
    const m_ctx = ctx.context.get(MONSTER_CONTEXT);
    if (m_ctx === undefined) return;
    else t.buffer(ctx.gl, m_ctx);

    if (input.mode === "mobile") {
      q.run(world, q.id("render") ?? q([Sprite, Transform, UI, MobileUI]), (_, sprite, transform, ui) => {
        frame_buffer[0] = transform.width;
        frame_buffer[1] = transform.height;
        frame_buffer[2] = sprite.frame.uv_width;
        frame_buffer[3] = sprite.frame.uv_height;
        frame_buffer[4] = sprite.frame.x;
        frame_buffer[5] = sprite.frame.y;

        if (ui.id === "joystick" || ui.id === "joystick_handle") {
          const movement = input._movement;
          if (movement !== undefined && ui.id === "joystick") {
            transform.position = new Float32Array([
              movement.screen_click_x - transform.width / 2,
              movement.screen_click_y - transform.height / 2,
            ]);
            Sprite.render(ctx, sprite, Transform.view(world, transform), frame_buffer, 1);
          }

          if (movement !== undefined && ui.id === "joystick_handle") {
            transform.position = new Float32Array([
              movement.screen_current_x - transform.width / 2,
              movement.screen_current_y - transform.height / 2,
            ]);
            Sprite.render(ctx, sprite, Transform.view(world, transform), frame_buffer, 1);
          }
        } else {
          Sprite.render(ctx, sprite, Transform.view(world, transform), frame_buffer, 1);
        }
      });
    } else {
      q.run(world, q.id("render") ?? q([Sprite, Transform, UI, DesktopUI]), (_, sprite, transform) => {
        frame_buffer[0] = transform.width;
        frame_buffer[1] = transform.height;
        frame_buffer[2] = sprite.frame.uv_width;
        frame_buffer[3] = sprite.frame.uv_height;
        frame_buffer[4] = sprite.frame.x;
        frame_buffer[5] = sprite.frame.y;

        Sprite.render(ctx, sprite, Transform.view(world, transform), frame_buffer, 1);
      });
    }
  })
);

main_world.system(
  sys([WebGL], (_, ctx) => {
    const pp_ctx = ctx.context.get(POST_PASS_CONTEXT);
    const bg_context = ctx.context.get(BACKGROUND_CONTEXT);
    const monster_context = ctx.context.get(MONSTER_CONTEXT);

    if (pp_ctx instanceof PostPass && bg_context && monster_context) {
      // part of contact
      t.buffer(ctx.gl, pp_ctx);
      Context.render(ctx, bg_context);
      Context.render(ctx, monster_context);
      t.buffer(ctx.gl, undefined);
      PostPass.render(ctx, pp_ctx);

      // part of contract
      bg_context.need_clear = true;
      monster_context.need_clear = true;
      pp_ctx.need_clear = true;
    }
  })
);

main_world.system(
  sys([LocalCollisionWorld], (world, lcw) => {
    Visible.clear_collection(world);
    lcw.world.clear();
  })
);

// TOOO: think about a way how to test code ?
// TODO: think about logging ?

scheduler.start();
