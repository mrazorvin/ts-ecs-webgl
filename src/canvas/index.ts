import { LoopInfo, RafScheduler, Resource, sys, World } from "@mr/ecs/World";
import { ColorShader } from "./ColorShader";
import { Model } from "./Model";
import { Mesh } from "./Render/Mesh";
import { Grid } from "./Render/Primitive/Grid";
import { Shader } from "./Render/Shader";
import { WebGL } from "./Render/WebGL";
import { View } from "./View";
import { t } from "./WebGLUtils";

const world = new World();
const scheduler = new RafScheduler(world).start();
const gl = WebGL.setup(document, "app");

world.resource(gl);

world.system_once(
  sys([WebGL], (_, ctx) => {
    t.size(ctx.gl, 500, 500);
    t.clear(ctx.gl, [1, 1, 1, 1]);

    const shader_id = ctx.create_shader(
      ColorShader.fragment_shader,
      ColorShader.vertex_shader,
      (gl, program) =>
        ColorShader.create(gl, program, [
          [0.8, 0.8, 0.8],
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ])
    );

    const mesh_name = ctx.create_mesh("grid", (gl) => Grid.create(gl));

    const model = new Model([Mesh, mesh_name]);
    const view = new View([ColorShader, shader_id]);

    world.entity(model, view);
  })
);

world.system(
  sys([WebGL, LoopInfo], (world, ctx, loop) => {
    t.clear(ctx.gl, undefined);

    world.query([View, Model], (_, view, model) => {
      const shader = view.get(ctx, ColorShader);
      const mesh = model.get(ctx, Mesh);
      if (shader && mesh) {
        Shader.render_mesh(ctx.gl, shader, mesh);
      }
    });
  })
);
