import { Mesh, MeshID } from "src/canvas/Render/Mesh";
import { Shader, ShaderID } from "src/canvas/Render/Shader";
import { ShaderGlobals } from "src/canvas/Render/ShaderGlobal";
import { t } from "src/canvas/Render/WebGLUtils";
import { ComponentFactory, InitComponent } from "src/ecs/Component";

export class DebuggerMesh extends Mesh {
  color: [r: number, g: number, b: number, a: number] = [1, 1, 1, 1];

  static create(
    gl: WebGL2RenderingContext,
    opts: {
      vertices: Float32Array;
      color: DebuggerMesh["color"];
    },
  ) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    if (vao == null) {
      throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
    }

    const vertex_buffer = Mesh.attribute_buffer(gl, {
      array: opts.vertices,
      component_length: 3,
      attribute: ShaderGlobals.Attributes.a_Position,
    });

    const mesh = new DebuggerMesh(
      gl.POINTS as never,
      vao,
      {
        vertex: vertex_buffer,
        uv: null,
        index: null,
        normal: null,
      },
      {
        instances_count: 1,
        vertices_per_instaces: opts.vertices.length,
      },
    );

    return Object.assign(mesh, { color: opts.color });
  }

  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }

  set_color(color: string) {
    if (color.length < 6 || color[0] !== "#") {
      throw new Error("VertexDebugger supports only hex colors:  #FFFFFF");
    }

    this.color = [
      parseInt(color[1] + color[2], 16) / 255.0,
      parseInt(color[3] + color[4], 16) / 255.0,
      parseInt(color[5] + color[6], 16) / 255.0,
      1,
    ];
  }
}

export class DebuggerShader extends Shader {
  info!: t.ProgramInfo;

  static create(gl: WebGL2RenderingContext) {
    const { program, info } = t.program(gl, [t.shader(gl, fragment, "FRAGMENT"), t.shader(gl, vertext, "VERTEX")], {
      layout_attributes: { [ShaderGlobals.Attributes.a_Position]: ShaderGlobals.a_Position },
    });

    return Object.assign(new DebuggerShader(program), { info });
  }

  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}

export const fragment = `#version 300 es
	precision mediump float;

	in  vec4 in_Color;
	out vec4  o_Color;
	void main(void) {
		o_Color = in_Color;
	}
`;

export const vertext = `#version 300 es
	in vec3 a_Position;

  uniform vec4 u_Color;
  uniform vec3 u_CameraPos;
	uniform mat4 u_Transform;
  uniform mat4 u_ProjectionTransform;
	uniform mat4 u_CameraTransform;

  out lowp vec4 in_Color;
	void main(void) {
    in_Color     = u_Color;
    gl_PointSize = (1.0 - distance(u_CameraPos, a_Position) / 10.0) * 10.0;
		gl_Position  = u_ProjectionTransform * u_CameraTransform * u_Transform * vec4(a_Position, 1);
	}
`;

export class Debugger extends InitComponent({ use_pool: false }) {
  static create = ComponentFactory(Debugger, (_, mesh_id, shader_id) => new Debugger(mesh_id, shader_id));
  constructor(
    public mesh_id: MeshID,
    public shader_id: ShaderID,
  ) {
    super();
  }
}
