import { Mesh } from "src/canvas/Render/Mesh";
import { ShaderGlobals } from "src/canvas/Render/ShaderGlobal";

export function parseOBJ(obj_file: string, flipYUV: boolean) {
  const uv_cache: number[] = [];
  const normal_cache: number[] = [];
  const vertex_cache: number[] = [];
  const indicies_cache: { [key: string]: number; length: number } = { length: 0 };

  const uv: number[] = [];
  const normals: number[] = [];
  const vertices: number[] = [];
  const indicies: number[] = [];

  let line_offset = 0;
  while (true) {
    const line_end = obj_file.indexOf("\n", line_offset);
    const line = obj_file.substring(obj_file.indexOf(" ", line_offset) + 1, line_end);
    if (line_end === -1) {
      break;
    }

    const is_uv = obj_file[line_offset] === "v" && obj_file[line_offset + 1] === "t";
    const is_vertex = obj_file[line_offset] === "v" && obj_file[line_offset + 1] === " ";
    const is_normal = obj_file[line_offset] === "v" && obj_file[line_offset + 1] === "n";
    const is_fragment = obj_file[line_offset] === "f";

    const indice = line.split(" ") as
      | [v1: string, v2: string]
      | [v1: string, v2: string, v3: string]
      | [v1: string, v2: string, v3: string, v4: string];

    const simple_buffer = is_vertex ? vertex_cache : is_normal ? normal_cache : is_uv ? uv_cache : null;
    if (simple_buffer != null) {
      for (const value of indice) {
        simple_buffer.push(parseFloat(value));
      }
    }

    if (is_fragment) {
      for (const indice_point of indice) {
        if (indice_point.length === 4) {
          throw new Error("Quad not supproted");
        }

        const point_index = indicies_cache[indice_point];
        if (point_index != null) {
          indicies.push(point_index);
          continue;
        }

        const [raw_vertice_index, raw_uv_index, raw_normal_index] = indice_point.split("/");
        const vertice_index = (parseInt(raw_vertice_index) - 1) * 3;
        const normal_index = (parseInt(raw_normal_index) - 1) * 3;
        const uv_index = (parseInt(raw_uv_index) - 1) * 2;

        uv.push(uv_cache[uv_index], flipYUV ? 1 - uv_cache[uv_index + 1] : uv_cache[uv_index + 1]);
        normals.push(normal_cache[normal_index], normal_cache[normal_index + 1], normal_cache[normal_index + 2]);
        vertices.push(vertex_cache[vertice_index], vertex_cache[vertice_index + 1], vertex_cache[vertice_index + 2]);
        indicies.push(indicies_cache.length);

        indicies_cache[indice_point] = indicies_cache.length;
        indicies_cache.length += 1;
      }
    }

    line_offset = line_end + 1;
  }

  class ObjectMesh extends Mesh {
    static create(gl: WebGL2RenderingContext) {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);

      if (vao == null) {
        throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
      }

      const vertex_buffer = Mesh.attribute_buffer(gl, {
        array: new Float32Array(vertices),
        component_length: 3,
        attribute: ShaderGlobals.Attributes.a_Position,
      });

      const uv_buffer = Mesh.attribute_buffer(gl, {
        array: new Float32Array(uv),
        component_length: 2,
        attribute: ShaderGlobals.Attributes.a_UV,
      });

      const index_buffer = Mesh.index_buffer(gl, {
        array: new Uint16Array(indicies),
      });

      gl.bindVertexArray(null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      const mesh = new ObjectMesh(
        gl.TRIANGLES,
        vao,
        {
          vertex: vertex_buffer,
          uv: uv_buffer,
          index: index_buffer,
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

  return ObjectMesh;
}
