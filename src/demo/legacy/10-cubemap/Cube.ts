import { ShaderGlobals } from "src/canvas/Render/ShaderGlobal";
import { Mesh, MeshID } from "src/canvas/Render/Mesh";
import { ShaderID, Shader } from "src/canvas/Render/Shader";
import { t } from "src/canvas/Render/WebGLUtils";
import { ComponentFactory, InitComponent } from "src/ecs/Component";
import { TextureID } from "src/canvas/Render/Texture";

enum CubeFace {
  Front = 0,
  Back = 1,
  Left = 2,
  Bottom = 3,
  Right = 4,
  Top = 5,
}

export const CUBE_MESH = new MeshID();
export class CubeMesh extends Mesh {
  static create(gl: WebGL2RenderingContext, { width = 1, height = 1, depth = 1, x = 0, y = 0, z = 0 }) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    if (vao == null) {
      throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
    }

    type Point = [x: number, y: number, z: number];
    type QuadCubeSide = [Point, Point, Point, Point, CubeFace];
    type Cube = [
      Front: QuadCubeSide,
      Back: QuadCubeSide,
      Left: QuadCubeSide,
      Bottom: QuadCubeSide,
      Right: QuadCubeSide,
      Top: QuadCubeSide,
    ];

    const half_width = width / 2;
    const half_height = height / 2;
    const half_depth = depth / 2;
    const x0 = x - half_width;
    const x1 = x + half_width;
    const y0 = y - half_height;
    const y1 = y + half_height;
    const z0 = z - half_depth;
    const z1 = z + half_depth;

    const cube: Cube = [
      [[x0, y1, z1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], CubeFace.Front],
      [[x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], CubeFace.Back],
      [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], CubeFace.Left],
      [[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, x0, z1], CubeFace.Bottom],
      [[x1, y1, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], CubeFace.Right],
      [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], CubeFace.Top],
    ];

    const vertices = cube.flatMap(([p1, p2, p3, p4, face]) => [
      [...p1, face],
      [...p2, face],
      [...p3, face],
      [...p4, face],
    ]);

    const vertex = Mesh.attribute_buffer(gl, {
      array: new Float32Array(vertices.flat().flat()),
      component_length: 4,
      attribute: ShaderGlobals.Attributes.a_Position,
    });

    const uv = Mesh.attribute_buffer(gl, {
      array: new Float32Array(
        cube.flatMap(() =>
          [
            [0, 0],
            [0, 1],
            [1, 1],
            [1, 0],
          ].flat(),
        ),
      ),
      component_length: 2,
      attribute: ShaderGlobals.Attributes.a_UV,
    });

    const indecies: number[] = [];
    for (let i = 0; i < cube.length; i++) {
      const offset = i * 4;
      indecies.push(...[offset + 0, offset + 1, offset + 2], ...[offset + 2, offset + 3, offset + 0]);
    }

    const index = Mesh.index_buffer(gl, {
      array: new Uint16Array(indecies),
    });

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const mesh = new CubeMesh(
      gl.TRIANGLES,
      vao,
      {
        vertex,
        uv,
        index: index,
        normal: null,
      },
      {
        instances_count: 1,
        vertices_per_instaces: 4,
      },
    );

    return mesh;
  }

  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}

export const CUBE_SHADER = new ShaderID();
export class CubeShader extends Shader {
  info!: t.ProgramInfo;

  static create(gl: WebGL2RenderingContext) {
    const { program, info } = t.program(gl, [t.shader(gl, fragment, "FRAGMENT"), t.shader(gl, vertext, "VERTEX")], {
      layout_attributes: {
        [ShaderGlobals.Attributes.a_Position]: ShaderGlobals.a_Position,
        [ShaderGlobals.Attributes.a_Transform]: ShaderGlobals.a_Transformation,
        [ShaderGlobals.Attributes.a_UV]: ShaderGlobals.a_UV,
      },
    });

    const shader = new CubeShader(program);
    shader.info = info;

    return shader;
  }

  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}

export const fragment = `#version 300 es
	precision mediump float;

	uniform highp sampler2DArray u_Image[1];

	in vec2 in_UV;
	out vec4 o_Color;
	void main(void) {
		o_Color = texture(u_Image[0], vec3(in_UV, 1));
	}
`;

export const vertext = `#version 300 es
	in vec4 a_Position;
	in vec2 a_UV;

	uniform mat4 u_Transform;
	uniform mat4 u_ProjectionTransform;
	uniform mat4 u_CameraTransform;

	out vec2 in_UV;
	void main(void) {
		in_UV = a_UV;
		gl_Position = vec4(u_ProjectionTransform * u_CameraTransform * u_Transform * vec4(a_Position.xyz, 1));
	}
`;

export class Cube extends InitComponent({ use_pool: false }) {
  static create = ComponentFactory(
    Cube,
    (_, texture_id, mesh_id, shader_id) => new Cube(texture_id, mesh_id, shader_id),
  );
  constructor(
    public texture_id: TextureID,
    public mesh_id: MeshID,
    public shader_id: ShaderID,
  ) {
    super();
  }
}
