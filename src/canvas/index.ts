import { glMatrix } from "gl-matrix";
import { LoopInfo, RafScheduler, sys, World } from "@mr/ecs/World";
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
import * as river_sprite from "url:./Assets/Backgrounds/River.png";

// @ts-ignore
import * as ogre_sprite from "url:./Assets/Monsters/Ogre/Ogre.png";
import * as atlas from "./Assets/Monsters/Ogre/Atlas.json";
import {
  PostPassShader,
  POST_PASS_SHADER,
} from "./Assets/View/PostPass/PostPass.shader";
import { PostPass, POST_PASS_CONTEXT } from "./Assets/View/PostPass/PostPass";

glMatrix.setMatrixArrayType(Array);

const ROWS = 120;
const BACKGROUND_CONTEXT = new ContextID();
const MONSTER_CONTEXT = new ContextID();

const world = new World();
const scheduler = new RafScheduler(world);
const gl = WebGL.setup(document, "app");

world.resource(new Screen());
world.resource(gl);
const bg_size = ROWS * 2;

const world_transform_component = new Transform({
  position: new Float32Array([-1, 1]),
  scale: new Float32Array([1, -1]),
  height: 0,
  width: 0,
});

const world_transform = world.entity(world_transform_component);
const bg_transform = new Transform({
  parent: world_transform.id,
  position: new Float32Array([160, 0]),
  height: bg_size,
  width: bg_size,
});

const resize_system = sys([WebGL, Screen], (_, ctx, screen) => {
  const { width, height } = t.size(ctx.gl, "100%", "100%");
  const width_ratio = width / (height / ROWS);
  world_transform_component.scale = new Float32Array([
    1 / width_ratio,
    -1 / ROWS,
  ]);
  screen.height = height;
  screen.width = width;
  ctx.create_context(BACKGROUND_CONTEXT, { width, height }, Context.create);
  ctx.create_context(MONSTER_CONTEXT, { width, height }, Context.create);
  ctx.create_context(POST_PASS_CONTEXT, { width, height }, PostPass.create);
});

window.onresize = () => world.system_once(resize_system);
world.system_once(resize_system);

world.system_once(
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

    const bg_image = await Texture.load_image(river_sprite);
    const bg_mesh = ctx.create_mesh((gl) =>
      SpriteMesh.create_rect(gl, {
        o_width: bg_size,
        o_height: bg_size,
        width: bg_size,
        height: bg_size,
      })
    );
    const bg_texture = ctx.create_texture(bg_image, Texture.create);

    const ogre_image = await Texture.load_image(ogre_sprite);
    const ogre_mesh = ctx.create_mesh((gl) =>
      SpriteMesh.create_rect(gl, {
        o_width: ogre_image.width,
        o_height: ogre_image.height,
        width: atlas.grid_width,
        height: atlas.grid_height,
      })
    );
    const ogre_texture = ctx.create_texture(ogre_image, Texture.create);

    world.entity(new Sprite(sprite_shader, bg_mesh, bg_texture), bg_transform);

    // TODO: inject entities in SubWorld instead of World
    world.entity(
      new Sprite(sprite_shader, ogre_mesh, ogre_texture),
      new Transform({
        parent: world_transform.id,
        position: new Float32Array([225, 110]),
        height: atlas.grid_width,
        width: atlas.grid_width,
      })
    );
  })
);

const run_frames = atlas.regions.filter((region) =>
  region.name.includes("idle")
);

// TODO: implement animation automat, move animation to ... ? Sprite or Animation component
let sec = 0;
let current_frame = 0;
const time_per_frame = 1 / run_frames.length;
world.system(
  sys([WebGL, LoopInfo, Screen], (sub_world, ctx, loop) => {
    t.clear(ctx.gl, undefined);

    sec += loop.time_delta;
    if (sec >= 1) sec = 0;
    current_frame = Math.round(sec / time_per_frame) % run_frames.length;
    const frame = run_frames[current_frame];

    const bg_ctx = ctx.context.get(BACKGROUND_CONTEXT);
    const m_ctx = ctx.context.get(MONSTER_CONTEXT);

    // TODO: Access to entities in SubWorld instead of World
    if (!bg_ctx || !m_ctx) return;
    sub_world.query([Sprite, Transform], (_, sprite, transform) => {
      if (transform === bg_transform) {
        t.buffer(ctx.gl, bg_ctx.frame_buffer, bg_ctx.width, bg_ctx.height);
        Sprite.render(ctx, sprite, Transform.view(world, transform), 0, 0);
      } else {
        t.buffer(ctx.gl, m_ctx.frame_buffer, m_ctx.width, m_ctx.height);
        Sprite.render(
          ctx,
          sprite,
          Transform.view(world, transform),
          frame.rect[0] / atlas.grid_width,
          frame.rect[1] / atlas.grid_height
        );
      }
    });
  })
);

world.system(
  sys([WebGL, Screen], (_, ctx, screen) => {
    const pp_ctx = ctx.context.get(POST_PASS_CONTEXT);
    const bg_context = ctx.context.get(BACKGROUND_CONTEXT);
    const monster_context = ctx.context.get(MONSTER_CONTEXT);

    // console.log({ pp_ctx });

    if (pp_ctx instanceof PostPass && bg_context && monster_context) {
      t.buffer(ctx.gl, null, screen.width, screen.height);

      // t.buffer(ctx.gl, pp_ctx, pp_ctx.width, pp_ctx.height);
      Context.render(ctx, bg_context);
      Context.render(ctx, monster_context);
      // t.buffer(ctx.gl, null, screen.width, screen.height);
      // PostPass.render(ctx, pp_ctx);
    }
  })
);

window.requestAnimationFrame(scheduler.start);
