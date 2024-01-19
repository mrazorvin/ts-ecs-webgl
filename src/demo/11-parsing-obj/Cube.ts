import { ShaderGlobals } from "src/canvas/Render/ShaderGlobal";
import { Mesh, MeshID } from "src/canvas/Render/Mesh";

export const CUBE_MESH = new MeshID();
export class CubeMesh extends Mesh {
  static create(gl: WebGL2RenderingContext, { width = 1, height = 1, depth = 1, x = 0, y = 0, z = 0 }) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    if (vao == null) {
      throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
    }

    type Point = [x: number, y: number, z: number];
    type QuadCubeSide = [Point, Point, Point, Point];
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
      [
        [x0, y1, z1],
        [x0, y0, z1],
        [x1, y0, z1],
        [x1, y1, z1],
      ],
      [
        [x1, y1, z0],
        [x1, y0, z0],
        [x0, y0, z0],
        [x0, y1, z0],
      ],
      [
        [x0, y1, z0],
        [x0, y0, z0],
        [x0, y0, z1],
        [x0, y1, z1],
      ],
      [
        [x0, y0, z1],
        [x0, y0, z0],
        [x1, y0, z0],
        [x1, x0, z1],
      ],
      [
        [x1, y1, z1],
        [x1, y0, z1],
        [x1, y0, z0],
        [x1, y1, z0],
      ],
      [
        [x0, y1, z0],
        [x0, y1, z1],
        [x1, y1, z1],
        [x1, y1, z0],
      ],
    ];

    const vertices = cube.flat();
    const vertex = Mesh.attribute_buffer(gl, {
      array: new Float32Array(vertices.flat().flat()),
      component_length: 3,
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
