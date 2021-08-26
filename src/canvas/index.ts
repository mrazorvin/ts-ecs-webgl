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

import { PostPassShader, POST_PASS_SHADER } from "./Assets/View/PostPass/PostPass.shader";
import { PostPass, POST_PASS_CONTEXT } from "./Assets/View/PostPass/PostPass";
import { Input } from "./Input";
import { hero, Hero } from "./Hero";
import { camera, Camera, camera_entity } from "./Camera";
import { Movement } from "./Modification";
import { MapLoader } from "./Assets/Map/MapLoader";
import { main_world } from "./MainWorld";
import { world_transform, world_transform_component } from "./WorldView";
import { CollisionShape, CollisionWorld, LocalCollisionWorld } from "./CollisionWorld";
import { SSCDRectangle, SSCDShape, SSCDVector } from "@mr/sscd";
import { Visible, visible } from "./Visible";
import { attack, joystick, joystick_handle } from "./Assets/UI";
import { DesktopUI, desktop_ui, MobileUI, mobile_ui, UI, UILayout, UIManager } from "./UI";
import { monsters } from "./Assets/Monsters";
import { Creature, creature } from "./Creature";
import { Static } from "./Static";
import { werewolf } from "./Assets/Monsters/Werewolf";
import { CreatureLayer, UILayer } from "./Layers";

glMatrix.setMatrixArrayType(Array);

const hero_assets = werewolf;

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
  const { width, height, canvas_w, canvas_h } = t.size(ctx.gl, "100%", "100%");
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
  input_ctx.container_width = canvas_w;
  input_ctx.container_height = canvas_h;
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
  sys([WebGL, Screen, Input, CollisionWorld], async (world, ctx, screen, input, sscd) => {
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
      Sprite.create(world, SPRITE_SHADER, attack_texture.id, attack_frame, 4),
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
      Sprite.create(world, SPRITE_SHADER, attack_texture.id, attack_frame, UILayer),
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
        UILayer
      ),
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
        UILayer
      ),
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

    const hero_image = await Texture.load_image(hero_assets.texture_src);
    const hero_texture = ctx.create_texture(hero_image, Texture.create);

    // TODO: inject entities in SubWorld instead of World
    const transform = Transform.create(world, {
      parent: camera_entity.ref,
      position: new Float32Array([0, 0]),
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
        CreatureLayer
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
        new SSCDVector(transform.position![0]! + transform.width / 2, transform.position![1]! + transform.width / 2),
        new SSCDVector(transform.width, transform.width)
      )
    );

    shape_manager.attach(hero_entity, shape);

    let x = 16;
    let y = 16;
    for (const monster of monsters) {
      const monster_image = await Texture.load_image(monster.texture_src);
      const monster_texture = ctx.create_texture(monster_image, Texture.create);
      const transform = Transform.create(world, {
        parent: camera_entity.ref,
        position: new Float32Array([(x += 16), (y += 16)]),
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
          CreatureLayer
        ),
        transform,
        creature,
      ]);

      const shape = sscd.attach(
        world,
        monster_entity.ref,
        new SSCDRectangle(
          new SSCDVector(transform.position![0]! + transform.width / 2, transform.position![1]! + transform.width / 2),
          new SSCDVector(transform.width, transform.width)
        )
      );
      shape_manager.attach(monster_entity, shape);
    }

    main_world.system_once(MapLoader);
  })
);

const animation = {
  run: hero_assets.atlas.regions.filter((region) => region.name.includes("run")),
  idle: hero_assets.atlas.regions.filter((region) => region.name.includes("idle")),
  attack: hero_assets.atlas.regions.filter((region) => region.name.includes("attack")),
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
    q.run(world, q.id("move") ?? q([Transform, Movement, Hero]), (_, transform, modification) => {
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
  sys([Input, Camera], (world, input, camera) => {
    q.run(world, q.id("animation") ?? q([Transform, Movement, Hero]), (_, transform, modification) => {
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

main_world.system(
  sys([WebGL, LoopInfo, Input], (world, ctx, loop, input) => {
    const run_frames = animation[selected_animation as "run"];
    const time_per_frame = 1 / run_frames.length;

    sec += loop.time_delta;
    if (sec >= 1) sec = 0;
    current_frame = Math.round(sec / time_per_frame) % run_frames.length;
    const frame = run_frames[current_frame];

    q.run(world, q.id("animation") ?? q([Sprite, Hero]), (_, sprite) => {
      sprite.frame.x = frame?.rect[0] / hero_assets.atlas.grid_width;
      sprite.frame.y = frame?.rect[1] / hero_assets.atlas.grid_height;
    });
  })
);

interface Tag {
  width: number;
  height: number;
  layer: number;
  texture: Texture.ID;
  x: number;
  y: number;
  view: Float32Array;
  frame: {
    uv_width: number;
    uv_height: number;
    x: number;
    y: number;
  };
}

const default_view = new Float32Array(9);
const default_frame = { uv_width: 0, uv_height: 0, x: 0, y: 0 };
const instanced_data = new Float32Array(9 * 1000);
const sprite_data = new Float32Array(6 * 1000);
const samplerArray: number[] = [];
const tagsCache = Array(1000)
  .fill(0)
  .map(
    (): Tag => ({
      x: 0,
      y: 0,
      layer: 0,
      width: 0,
      height: 0,
      texture: {} as Texture.ID,
      view: default_view,
      frame: default_frame,
    })
  );
const taggedEntities: Tag[] = [];

main_world.system(
  sys([WebGL], (world, ctx) => {
    const bg_ctx = ctx.context.get(BACKGROUND_CONTEXT);
    if (bg_ctx === undefined) return;
    else t.buffer(ctx.gl, bg_ctx);

    const gl = ctx.gl;
    const shader = ctx.shaders.get(SPRITE_SHADER)! as SpriteShader;
    const mesh = ctx.meshes.get(SPRITE_MESH)! as SpriteMesh;

    let taggedEntitiesSize = 0;

    const render = (_: unknown, transform: Transform, sprite: Sprite) => {
      const view = Transform.view(main_world, transform);
      const tag = tagsCache[taggedEntitiesSize]!;
      tag.width = transform.width;
      tag.height = transform.height;
      tag.x = transform.position![0]!;
      tag.y = transform.position![0]!;
      tag.layer = sprite.layer;
      tag.frame = sprite.frame;
      tag.texture = sprite.texture;
      tag.view = view;
      taggedEntities[taggedEntitiesSize] = tag;
      taggedEntitiesSize += 1;
    };

    q.run(world, q.id("render_static") ?? q([Transform, Sprite, Static, Visible]), render);
    q.run(world, q.id("render_hero") ?? q([Transform, Sprite, Hero]), render);
    q.run(world, q.id("render_creature") ?? q([Transform, Sprite, Creature, Visible]), render);

    taggedEntities.length = taggedEntitiesSize;

    taggedEntities.sort((v1, v2) => {
      if (v1.layer !== v2.layer) return v1.layer > v2.layer ? 1 : -1;
      if (v1.y !== v2.y) return v1.y + v1.height > v2.y + v2.height ? 1 : -1;
      if (v1.x !== v2.x) return v1.x > v2.x ? 1 : -1;

      return 0;
    });

    const data = instanced_data;

    let idx = 0;
    let cache: { [key: string]: number } = {};
    let cache_size = 0;

    gl.useProgram(shader.program);
    gl.bindVertexArray(mesh.vao);

    for (const tag of taggedEntities) {
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
            idx // num instances
          );

          // reset loop values
          idx = 0;
          cache = {};
          cache_size = 0;
          samplerArray.length = 0;
        }

        const texture = ctx.textures.get(tag.texture)!;

        gl.activeTexture(gl.TEXTURE0 + cache_size);
        gl.bindTexture(gl.TEXTURE_2D, texture.texture);

        samplerArray[cache_size] = cache_size;
        cache[tag.texture.id] = cache_size;
        cache_size += 1;
      }

      const view = tag.view;
      const frame = tag.frame;

      data[idx * 9 + 0] = view[0]!;
      data[idx * 9 + 1] = view[1]!;
      data[idx * 9 + 2] = view[2]!;
      data[idx * 9 + 3] = view[3]!;
      data[idx * 9 + 4] = view[4]!;
      data[idx * 9 + 5] = view[5]!;
      data[idx * 9 + 6] = view[6]!;
      data[idx * 9 + 7] = view[7]!;
      data[idx * 9 + 8] = view[8]!;
      sprite_data[idx * 7 + 0] = tag.width;
      sprite_data[idx * 7 + 1] = tag.height;
      sprite_data[idx * 7 + 2] = frame.uv_width;
      sprite_data[idx * 7 + 3] = frame.uv_height;
      sprite_data[idx * 7 + 4] = frame.x;
      sprite_data[idx * 7 + 5] = frame.y;
      sprite_data[idx * 7 + 6] = texture_pos ?? cache_size - 1;

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
        idx // num instances
      );
    }

    samplerArray.length = 0;
    gl.bindVertexArray(null);
    gl.useProgram(null);
  })
);

let frame_buffer = new Float32Array(6);

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
