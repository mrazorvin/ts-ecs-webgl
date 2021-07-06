import { LoopInfo, RafScheduler, Resource, sys, World } from "@mr/ecs/World";
import { ColorShader } from "./ColorShader";
import { Model } from "./Model";
import { Mesh } from "./Render/Mesh";
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
      (gl, program) => ColorShader.create(gl, program)
    );

    const mesh_name = ctx.create_mesh("dots", (gl) =>
      Object.assign(
        Mesh.create(gl, { vertexes: new Float32Array([0, 0, 0]) }),
        { mode: gl.POINTS }
      )
    );

    const model = new Model([Mesh, mesh_name]);
    const view = new View([ColorShader, shader_id]);

    world.entity(model, view);
  })
);

let point_size = 0;
let point_size_step = 3;
let angle = 0;
let angle_step = (Math.PI / 180) * 90;

world.system(
  sys([WebGL, LoopInfo], (world, ctx, loop) => {
    t.clear(ctx.gl, undefined);

    point_size += point_size_step * loop.time_delta;
    angle += angle_step * loop.time_delta;

    world.query([View, Model], (_, view, model) => {
      const shader = view.get(ctx, ColorShader);
      const mesh = model.get(ctx, Mesh);
      if (shader && mesh) {
        ColorShader.use(ctx.gl, shader, Math.sin(point_size) * 10 + 30, angle);
        Shader.render_mesh(ctx.gl, shader, mesh);
      }
    });
  })
);
