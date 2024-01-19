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
import { QUAD_MESH, QUAD_SHADER, QuadMesh, QuadShader } from "./Quad";
// @ts-expect-error
import * as quad_texture_png from "url:./UV_Grid_Lrg.jpg";
import { Texture } from "src/canvas/Render/Texture";
import { CUBE_MESH, CubeMesh } from "./Cube";
import { Model } from "./Model";
import { ModelShader, MODEL_SHADER } from "./Model";
import { Skybox, SkyboxShader, skybox_images } from "./skybox/skybox";
import { pirate_girl } from "./pirate_girl/pirate_girl";
import { parseOBJ } from "./parseOBJ";
import { Debugger, DebuggerMesh, DebuggerShader } from "./Debugger";

const scheduler = new RafScheduler(main_world);
const gl = WebGL.setup(document, "app");
const context = new ContextID();

main_world.resource(Input3D.create(gl.canvas));
main_world.resource(gl);
main_world.resource(new Camera3D());
main_world.resource(new Screen());

const resize_system = sys([WebGL, Screen, Input3D, Camera3D], async (_, ctx, screen, input, camera) => {
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
  sys([WebGL, Screen], async (world, ctx) => {
    ctx.create_mesh(GridMesh.create, { id: GRID_MESH });
    ctx.create_shader(GridShader.create, { id: GRID_SHADER });

    ctx.create_mesh(QuadMesh.create, { id: QUAD_MESH });
    ctx.create_shader(QuadShader.create, { id: QUAD_SHADER });

    ctx.create_mesh(CubeMesh.create, { id: CUBE_MESH });
    ctx.create_shader(ModelShader.create, { id: MODEL_SHADER });

    main_world.entity([Transform3D.create(world), Grid.create(world)]);

    const cube_image = await Texture.load_image(quad_texture_png)!;
    const cube_texture = ctx.create_texture(cube_image, (gl, image) => Texture.create(gl, image, image));

    const skybox_day_images = await Promise.all(Object.values(skybox_images.miramar)).then((images) =>
      ctx.create_texture(images, (gl, images) => Texture.create_cubemap(gl, images)),
    );

    const skybox_night_images = await Promise.all(Object.values(skybox_images.grimmnight)).then((images) =>
      ctx.create_texture(images, (gl, images) => Texture.create_cubemap(gl, images)),
    );

    const skybox_mesh = ctx.create_mesh(CubeMesh.create, { width: 20, height: 20, depth: 20 });
    const skybox_shader = ctx.create_shader(SkyboxShader.create, {});

    skybox_mesh.mesh.enable_blending = true;
    skybox_mesh.mesh.disable_culling = true;

    const PirateGirldMesh = parseOBJ(pirate_girl.obj, true);

    const pirate_girl_mesh = ctx.create_mesh(PirateGirldMesh.create, {});
    const pirate_girl_texture = ctx.create_texture(await pirate_girl.image, (gl, image) =>
      Texture.create(gl, image, image),
    );

    const debbuger_mesh = ctx.create_mesh(DebuggerMesh.create, {
      color: [1, 1, 1, 1],
      vertices: pirate_girl_mesh.mesh.vertex?.data as Float32Array,
    });

    const debbuger_shader = ctx.create_shader(DebuggerShader.create, {});

    main_world.entity([Debugger.create(world, debbuger_mesh.id, debbuger_shader.id)]);

    main_world.entity([
      Transform3D.create(world)
        .update((t) => (t.position.y = 0.5))
        .update((t) => t.scale.set(0.25, 0.25, 0.25)),
      Model.create(world, pirate_girl_texture.id, pirate_girl_mesh.id, MODEL_SHADER),
    ]);

    main_world.entity([
      Transform3D.create(world)
        .update((t) => (t.position.y = 0.25))
        .update((t) => t.scale.set(0.5, 0.5, 0.5)),
      Model.create(world, cube_texture.id, CUBE_MESH, MODEL_SHADER),
    ]);

    main_world.entity([
      Transform3D.create(world),
      Skybox.create(world, skybox_day_images.id, skybox_night_images.id, skybox_mesh.id, skybox_shader.id),
    ]);
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
        camera.transform.rotation.y += deltaX * (ROTATE_RATE / screen.width);
        camera.transform.rotation.x += deltaY * (ROTATE_RATE / screen.height);
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

      if (mesh instanceof GridMesh && shader) {
        shader.info?.use(
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

      q.run(world, q.id("debugger") ?? q([Debugger]), (_, { mesh_id, shader_id }) => {
        const shader = ctx.shaders.get(shader_id);
        const mesh = ctx.meshes.get(mesh_id);

        if (mesh instanceof DebuggerMesh && shader) {
          shader.info?.use({
            uniforms: {
              u_ProjectionTransform: camera.project_mat4,
              u_CameraTransform: camera.view_ma4,
              u_Color: mesh.color,
              u_CameraPos: camera.transform.position.as_array(),
            },
            mesh,
          });
        }
      });

      q.run(world, q.id("models") ?? q([Transform3D, Model]), (_, transform, { texture_id, mesh_id, shader_id }) => {
        const shader = ctx.shaders.get(shader_id);
        const mesh = ctx.meshes.get(mesh_id);
        const texutre = ctx.textures.get(texture_id);
        if (!mesh || !shader || !texutre) {
          return;
        }

        shader.info?.use(
          {
            uniforms: {
              u_Transform: transform.mat4.raw,
              u_ProjectionTransform: camera.project_mat4,
              u_CameraTransform: camera.view_ma4,
              "u_Image[0]": [0],
            },
            mesh,
          },
          (gl) => {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D_ARRAY, texutre?.texture!);
          },
        );
      });

      q.run(
        world,
        q.id("skybox") ?? q([Transform3D, Skybox]),
        (_, transform, { day_texture_id, night_texture_id, mesh_id, shader_id }) => {
          const shader = ctx.shaders.get(shader_id);
          const mesh = ctx.meshes.get(mesh_id);
          const day_texutre = ctx.textures.get(day_texture_id);
          const night_texture = ctx.textures.get(night_texture_id);
          if (!shader || !mesh || !day_texutre || !night_texture) {
            return;
          }

          shader.info?.use(
            {
              uniforms: {
                u_Transform: transform.mat4.raw,
                u_ProjectionTransform: camera.project_mat4,
                u_CameraTransform: camera.mat4_without_translate(),
                u_Time: performance.now(),
                u_DayTex: 0,
                u_NightTex: 1,
              },
              mesh,
            },
            (gl) => {
              gl.activeTexture(gl.TEXTURE0);
              gl.bindTexture(gl.TEXTURE_CUBE_MAP, day_texutre.texture);

              gl.activeTexture(gl.TEXTURE1);
              gl.bindTexture(gl.TEXTURE_CUBE_MAP, night_texture.texture);
            },
          );
        },
      );
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
