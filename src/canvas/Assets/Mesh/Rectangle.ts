import { Mesh, MeshID } from "../../Render/Mesh";
import { ShaderGlobals } from "../../Render/ShaderGlobal";

export const RECTANGLE_MESH = new MeshID();

export class Rectangle extends Mesh {
  uv_width = 0;
  uv_height = 0;
}

export namespace Rectangle {
  export function create_rect(
    gl: WebGL2RenderingContext,
    { x = 0, y = 0, width = 0, height = 0, o_width = 0, o_height = 0 }
  ): Mesh {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    if (vao == null) {
      throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
    }

    const uv_width = width / o_width;
    const uv_height = height / o_height;

    const uv_rectangle = new Float32Array([
      ...[0, 0],
      ...[uv_width, 0],
      ...[0, uv_height],

      ...[0, uv_height],
      ...[uv_width, 0],
      ...[uv_width, uv_height],
    ]);

    const rectangle = new Float32Array([
      ...[x, y],
      ...[x + width, y],
      ...[x, y + height],

      ...[x, y + height],
      ...[x + width, y],
      ...[x + width, y + height],
    ]);

    const vertex = Mesh.attribute_buffer(gl, {
      array: rectangle,
      component_length: 2,
      attribute: ShaderGlobals.Attribute.Position,
    });

    const uv = Mesh.attribute_buffer(gl, {
      array: uv_rectangle,
      component_length: 2,
      attribute: ShaderGlobals.Attribute.UV,
    });

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const rect = new Rectangle(gl.TRIANGLE_STRIP, vao, {
      vertex,
      normal: null,
      uv,
      index: null,
    });

    rect.uv_height = uv_height;
    rect.uv_width = uv_width;

    return rect;
  }
}
