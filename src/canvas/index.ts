import { glMatrix, vec2 } from "gl-matrix";
import { EntityRef, LoopInfo, q, RafScheduler, sys } from "@mr/ecs/World";
import { SpriteMesh } from "./Assets/View/Sprite/Sprite.mesh";
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
import { MapLoader, map_mesh, map_shader, map_texture } from "./Assets/Map/MapLoader";
import { main_world } from "./MainWorld";
import { world_transform_component } from "./WorldView";
import { CollisionWorld, LocalCollisionWorld } from "./CollisionWorld";
import { SSCDRectangle, SSCDShape, SSCDVector } from "@mr/sscd";
import { Visible, visible } from "./Visible";
import { SpriteInstancingMesh } from "./Assets/View/SpriteInstancing/SpriteInstancing.mesh";
import { SpriteInstancingShader } from "./Assets/View/SpriteInstancing/SpriteInstancing.shader";

glMatrix.setMatrixArrayType(Array);

// this value must somehow refer to 32x32 grid size, for simplification reason
const ROWS = 160;
const BACKGROUND_CONTEXT = new ContextID();
const MONSTER_CONTEXT = new ContextID();

const scheduler = new RafScheduler(main_world);
const gl = WebGL.setup(document, "app");
const input = Input.create(gl.canvas);

main_world.resource(input);
main_world.resource(new Screen());
main_world.resource(gl);
main_world.resource(camera);
main_world.resource(new CollisionWorld());
main_world.resource(new LocalCollisionWorld());

const resize_system = sys([WebGL, Screen, Input], (_, ctx, screen, input) => {
  const { width, height } = t.size(ctx.gl, "100%", "100%");
  const width_ratio = width / (height / ROWS);

  // all following code must be part of different contracts
  // there should be some kind of marker for RESIZE contract call
  // like behavior_start("RESIZE") && behavior_end("RESIZE");
  // in development mode on the end of systems, we will iterate over all contracts and check of they still valid
  // in production mode contracts will be no-op

  world_transform_component.scale = new Float32Array([1 / width_ratio, -1 / ROWS]);
  screen.height = height;
  screen.width = width;
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
  input_ctx.camera_width = camera.transform.width = width_ratio * 2;
  input_ctx.camera_height = camera.transform.height = ROWS * 2;
  camera.transform.position = new Float32Array([0, 0]);
});

window.onresize = () => main_world.system_once(resize_system);
main_world.system_once(resize_system);

main_world.system_once(
  sys([WebGL], async (world, ctx) => {
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
      Sprite.create(world, sprite_shader, ogre_mesh, ogre_texture),
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

main_world.system(
  sys([WebGL], (world, ctx) => {
    const bg_ctx = ctx.context.get(BACKGROUND_CONTEXT);
    const gl = ctx.gl;
    if (bg_ctx === undefined || map_shader === undefined) return;
    else t.buffer(ctx.gl, bg_ctx);

    const bg_texture = ctx.textures.get(map_texture)!.texture;

    let idx = 0;
    const mesh = ctx.meshes.get(map_mesh) as SpriteInstancingMesh;
    const data = mesh.transformation_data;

    q.run(world, q.id("render") ?? q([Transform, Sprite, Static, Visible]), (_, transform) => {
      const view = Transform.view(main_world, transform);

      data[idx * 9 + 0] = view[0]!;
      data[idx * 9 + 1] = view[1]!;
      data[idx * 9 + 2] = view[2]!;
      data[idx * 9 + 3] = view[3]!;
      data[idx * 9 + 4] = view[4]!;
      data[idx * 9 + 5] = view[5]!;
      data[idx * 9 + 6] = view[6]!;
      data[idx * 9 + 7] = view[7]!;
      data[idx * 9 + 8] = view[8]!;

      idx++;
    });

    const shader = ctx.shaders.get(map_shader)! as SpriteInstancingShader;

    gl.useProgram(shader.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, bg_texture);
    gl.uniform1i(shader.location.Image, 0);
    gl.bindVertexArray(mesh.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.transformation_buffer.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.transformation_data.subarray(0, idx * 9));
    gl.drawArraysInstanced(
      gl.TRIANGLE_STRIP,
      0, // offset
      6, // num vertices per instance
      idx - 1 // num instances
    );
    gl.bindVertexArray(null);
    gl.useProgram(null);
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
    });
  })
);

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
      Sprite.render(
        ctx,
        sprite,
        Transform.view(world, transform),
        frame!.rect[0]! / atlas.grid_width,
        frame!.rect[1]! / atlas.grid_height
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

main_world.system(
  sys([LocalCollisionWorld], (world, lcw) => {
    Visible.clear_collection(world);
    lcw.world.clear();
  })
);

// TOOO: think about a way how to test code ?
// TODO: think about logging ?

scheduler.start();
