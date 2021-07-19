import { glMatrix, vec2 } from "gl-matrix";
import { Component, LoopInfo, RafScheduler, sys, World } from "@mr/ecs/World";
import { SpriteMesh } from "./Assets/View/Sprite/Sprite.mesh";
import {
  SpriteShader,
  SPRITE_SHADER,
} from "./Assets/View/Sprite/Sprite.shader";
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
import {
  PostPassShader,
  POST_PASS_SHADER,
} from "./Assets/View/PostPass/PostPass.shader";
import { PostPass, POST_PASS_CONTEXT } from "./Assets/View/PostPass/PostPass";
import { Input } from "./Input";
import { Creature } from "./Creature";
import { Static } from "./Static";
import { camera, Camera, camera_entity } from "./Camera";
import { Modification } from "./Modification";
import { MapLoader } from "./Assets/Map/MapLoader";
import { main_world } from "./MainWorld";
import { world_transform_component } from "./WorldView";

glMatrix.setMatrixArrayType(Array);

// this value must somehow refer to 32x32 grid size, for simplification reason
const ROWS = 120;
const BACKGROUND_CONTEXT = new ContextID();
const MONSTER_CONTEXT = new ContextID();

const scheduler = new RafScheduler(main_world);
const gl = WebGL.setup(document, "app");
const input = Input.create(gl.canvas);

main_world.resource(input);
main_world.resource(new Screen());
main_world.resource(gl);
main_world.resource(camera);

const resize_system = sys([WebGL, Screen, Input], (_, ctx, screen, input) => {
  const { width, height } = t.size(ctx.gl, "100%", "100%");
  const width_ratio = width / (height / ROWS);

  // all following code must be part of different contracts
  // there should be some kind of marker for RESIZE contract call
  // like behavior_start("RESIZE") && behavior_end("RESIZE");
  // in development mode on the end of systems, we will iterate over all contracts and check of they still valid
  // in production mode contracts will be no-op

  world_transform_component.scale = new Float32Array([
    1 / width_ratio,
    -1 / ROWS,
  ]);
  screen.height = height;
  screen.width = width;
  ctx.create_context(BACKGROUND_CONTEXT, { width, height }, Context.create);
  ctx.create_context(MONSTER_CONTEXT, { width, height }, Context.create);
  ctx.create_context(
    POST_PASS_CONTEXT,
    { width, height, shader: POST_PASS_SHADER },
    PostPass.create
  );

  input.container_offset_x = gl.canvas.offsetLeft;
  input.container_offset_y = gl.canvas.offsetTop;
  input.container_width = width;
  input.container_height = height;
  input.world_height = ROWS * 2;
  input.world_width = width_ratio * 2;
  input.camera_width = camera.transform.width = width_ratio * 2;
  input.camera_height = camera.transform.height = ROWS * 2;
  camera.transform.position = new Float32Array([0, 0]);
});

window.onresize = () => main_world.system_once(resize_system);
main_world.system_once(resize_system);

main_world.system_once(
  sys([WebGL], async (_, ctx) => {
    t.clear(ctx.gl, [0, 0, 0, 0]);
    t.blend(ctx.gl);

    ctx.create_shader(
      PostPassShader.fragment_shader,
      PostPassShader.vertex_shader,
      PostPassShader.create,
      POST_PASS_SHADER
    );

    const sprite_shader = ctx.create_shader(
      SpriteShader.fragment_shader,
      SpriteShader.vertex_shader,
      SpriteShader.create,
      SPRITE_SHADER
    );

    const ogre_image = await Texture.load_image(ogre_sprite);
    const ogre_mesh = ctx.create_mesh((gl) =>
      SpriteMesh.create_rect(gl, {
        o_width: ogre_image.width,
        o_height: ogre_image.height,
        width: atlas.grid_width,
        height: atlas.grid_height,
      })
    );

    // entities initialization should be some how implemented from the JSON in separate system
    const ogre_texture = ctx.create_texture(ogre_image, Texture.create);

    // TODO: inject entities in SubWorld instead of World
    main_world.entity([
      new Sprite(sprite_shader, ogre_mesh, ogre_texture),
      new Transform({
        parent: camera_entity.ref,
        position: new Float32Array([0, 0]),
        height: atlas.grid_height,
        width: atlas.grid_width,
      }),
      new Creature(),
      new Modification(),
    ]);

    main_world.system_once(MapLoader);
  })
);

const animation = {
  run: atlas.regions.filter((region) => region.name.includes("run")),
  idle: atlas.regions.filter((region) => region.name.includes("idle")),
};
let selected_animation = "run";

// TODO: implement animation automat, move animation to ... ? Sprite or Animation component
let sec = 0;
let current_frame = 0;

main_world.system(
  sys([Input, Camera], (sub_world, input, camera) => {
    sub_world.query(
      [Transform, Modification, Creature],
      (_, transform, modification) => {
        if (input.click_x && input.click_y) {
          // part of contract even if we don't move camera, we still need to call function at least once
          camera.set_position(
            input.click_x - camera.transform.width / 2,
            input.click_y - camera.transform.height / 2
          );

          // part of contract camera position synchronization
          if (camera.transform.position) {
            input.camera_x = -camera.transform.position[0];
            input.camera_y = -camera.transform.position[1];
          }

          input.click_x = 0;
          input.click_y = 0;
        }

        // make a static method from Modification class
        const target_x = input.current_x - transform.width / 2;
        const target_y = input.current_y - transform.height / 2;
        const direction_x = transform.position[0] - target_x;
        const direction_y = transform.position[1] - target_y;
        modification.movement_target[0] = direction_x;
        modification.movement_target[1] = direction_y;
      }
    );
  })
);

main_world.system(
  sys([WebGL], (sub_world, ctx) => {
    const bg_ctx = ctx.context.get(BACKGROUND_CONTEXT);
    if (bg_ctx === undefined) return;
    else t.buffer(ctx.gl, bg_ctx);

    let i = 0;
    sub_world.query(
      [Sprite, Transform, Static],
      (_, sprite, transform, stat) => {
        const p1 =
          transform.position![0] -
          -Math.min(camera.transform.position![0], 0) +
          64;
        const p2 =
          -Math.min(camera.transform.position![0], 0) +
          camera.transform.width -
          transform.position![0] +
          64;
        const p3 =
          transform.position![1] -
          -Math.min(camera.transform.position![1], 0) +
          64;
        const p4 =
          -Math.min(camera.transform.position![1], 0) +
          camera.transform.height -
          transform.position![1] +
          64;

        if (p1 > 0 && p2 > 0 && p3 > 0 && p4 > 0) {
          i++;
          Sprite.render(
            ctx,
            sprite,
            Transform.view(main_world, transform),
            stat.x,
            stat.y
          );
        }
      }
    );
  })
);

main_world.system(
  sys([], (sub_world) => {
    sub_world.query(
      [Transform, Modification, Creature],
      (_, transform, modification) => {
        // those code some how connected to animation chain + movement behavior
        // think a better way to organize it
        if (
          !(
            modification.movement_target[0] > -0.5 &&
            modification.movement_target[0] < 0.5 &&
            modification.movement_target[1] > -0.5 &&
            modification.movement_target[1] < 0.5
          )
        ) {
          // instead of new buffer we could use buffer buffer switch, specify buffer switch little bit more
          const pos = new Float32Array(2);
          vec2.normalize(pos, modification.movement_target as [number, number]);
          const direction = pos[0];
          transform.position = vec2.subtract(
            pos,
            transform.position,
            pos
          ) as Float32Array;
          transform.scale = new Float32Array([direction > 0 ? 1 : -1, 1]);
          if (selected_animation === "idle") {
            selected_animation = "run";
            sec = 0;
          }
        } else {
          if (selected_animation === "run" && current_frame === 4) {
            selected_animation = "idle";
            sec = 0;
          }
        }
      }
    );
  })
);

main_world.system(
  sys([WebGL, LoopInfo, Input], (sub_world, ctx, loop, input) => {
    const run_frames = animation[selected_animation as "run"];
    const time_per_frame = 1 / run_frames.length;

    sec += loop.time_delta;
    if (sec >= 1) sec = 0;
    current_frame = Math.round(sec / time_per_frame) % run_frames.length;
    const frame = run_frames[current_frame];

    const m_ctx = ctx.context.get(MONSTER_CONTEXT);
    if (m_ctx === undefined) return;
    else t.buffer(ctx.gl, m_ctx);

    sub_world.query([Sprite, Transform, Creature], (_, sprite, transform) => {
      Sprite.render(
        ctx,
        sprite,
        Transform.view(main_world, transform),
        frame.rect[0] / atlas.grid_width,
        frame.rect[1] / atlas.grid_height
      );
    });
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

// TOOO: think about a way how to test code ?
// TODO: think about logging ?

scheduler.start();
