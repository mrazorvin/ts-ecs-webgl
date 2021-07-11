import { glMatrix } from "gl-matrix";
import { LoopInfo, RafScheduler, sys, World } from "@mr/ecs/World";
import { Rectangle, RECTANGLE_MESH } from "./Assets/Mesh/Rectangle";
import {
  MaterialShader,
  MATERIAL_SHADER,
} from "./Assets/Shader/Material/MaterialShader";
import { WebGL } from "./Render/WebGL";
import { Texture } from "./Render/Texture";
import { Sprite } from "./Sprite";
import { t } from "./WebGLUtils";
import { Transform } from "./Transform/Transform";
import { ROWS } from "./Globals";

// @ts-ignore
import * as bg from "url:./Assets/Images/Background.png";

// @ts-ignore
import * as ogre from "url:./Monsters/Ogre/Ogre.png";
import * as atlas from "./Monsters/Ogre/Atlas.json";

glMatrix.setMatrixArrayType(Array);

const world = new World();
const scheduler = new RafScheduler(world);
const gl = WebGL.setup(document, "app");

world.resource(gl);
const bg_size = 240;

const transform = new Transform({
  position: new Float32Array([-1, 1]),
  scale: new Float32Array([1, -1]),
  height: 0,
  width: 0,
});

const world_transform = world.entity(transform);
const bg_transform = new Transform({
  parent: world_transform.id,
  position: new Float32Array([160, 0]),
  height: bg_size,
  width: bg_size,
});

const resize_system = sys([WebGL], (_, ctx) => {
  const { width, height } = t.size(ctx.gl, "100%", "100%");
  const width_ratio = width / (height / ROWS);
  transform.scale = new Float32Array([1 / width_ratio, -1 / ROWS]);
});

window.onresize = () => world.system_once(resize_system);
world.system_once(resize_system);

world.system_once(
  sys([WebGL], async (_, ctx) => {
    t.clear(ctx.gl, [0.4, 0.4, 0.4, 1]);
    t.blend(ctx.gl);

    const sprite_shader = ctx.create_shader(
      MaterialShader.fragment_shader,
      MaterialShader.vertex_shader,
      MaterialShader.create,
      MATERIAL_SHADER
    );

    const bg_image = await Texture.load_image(bg);
    const bg_mesh = ctx.create_mesh((gl) =>
      Rectangle.create_rect(gl, {
        o_width: bg_size,
        o_height: bg_size,
        width: bg_size,
        height: bg_size,
      })
    );
    const bg_texture = ctx.create_texture(bg_image, Texture.create);

    const ogre_image = await Texture.load_image(ogre);
    const ogre_mesh = ctx.create_mesh((gl) =>
      Rectangle.create_rect(gl, {
        o_width: ogre_image.width,
        o_height: ogre_image.height,
        width: atlas.grid_width,
        height: atlas.grid_height,
      })
    );
    const ogre_texture = ctx.create_texture(ogre_image, Texture.create);

    world.entity(
      Sprite.create(sprite_shader, bg_mesh, bg_texture),
      bg_transform
    );

    // TODO: inject entities in SubWorld instead of World
    world.entity(
      Sprite.create(sprite_shader, ogre_mesh, ogre_texture),
      new Transform({
        parent: world_transform.id,
        position: new Float32Array([225, 110]),
        scale: new Float32Array([-1, 1]),
        height: atlas.grid_width,
        width: atlas.grid_width,
      })
    );
  })
);

const run_frames = atlas.regions.filter((region) =>
  region.name.includes("run")
);

// TODO: implement animation automat, move animation to ... ? Sprite or Animation component
let sec = 0;
let current_frame = 0;
const time_per_frame = 1 / run_frames.length;
world.system(
  sys([WebGL, LoopInfo], (sub_world, ctx, loop) => {
    t.clear(ctx.gl, undefined);

    sec += loop.time_delta;
    if (sec >= 1) sec = 0;
    current_frame = Math.round(sec / time_per_frame) % run_frames.length;
    const frame = run_frames[current_frame];

    // TODO: Access to entities in SubWorld instead of World
    sub_world.query([Sprite, Transform], (_, sprite, transform) => {
      if (transform === bg_transform) {
        Sprite.render(ctx, sprite, Transform.view(world, transform), 0, 0);
      } else {
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

window.requestAnimationFrame(scheduler.start);
