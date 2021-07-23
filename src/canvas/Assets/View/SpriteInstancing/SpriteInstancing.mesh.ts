import { Mesh } from "../../../Render/Mesh";
import { ShaderGlobals } from "../../../Render/ShaderGlobal";

export class SpriteInstancingMesh {
  constructor(
    public vertices_buffer: Mesh.Buffer,
    public uv_buffer: Mesh.Buffer,
    public transformation_buffer: Mesh.Buffer,
    public transformation_data: Float32Array,
    public vao: WebGLVertexArrayObject
  ) {}
}

export namespace SpriteInstancingMesh {
  export function create_rect(
    gl: WebGL2RenderingContext,
    { x = 0, y = 0, width = 0, height = 0, o_width = 0, o_height = 0 }
  ) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    if (vao == null) {
      throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
    }

    const uv_width = width / o_width;
    const uv_height = height / o_height;

    const uv_data = new Float32Array([
      ...[0, 0],
      ...[uv_width, 0],
      ...[0, uv_height],

      ...[0, uv_height],
      ...[uv_width, 0],
      ...[uv_width, uv_height],
    ]);

    const vertices_data = new Float32Array([
      ...[x, y],
      ...[x + width, y],
      ...[x, y + height],

      ...[x, y + height],
      ...[x + width, y],
      ...[x + width, y + height],
    ]);

    const vertices_buffer = Mesh.attribute_buffer(gl, {
      array: vertices_data,
      component_length: 2,
      attribute: ShaderGlobals.Attribute.Position,
    });

    const uv_buffer = Mesh.attribute_buffer(gl, {
      array: uv_data,
      component_length: 2,
      attribute: ShaderGlobals.Attribute.UV,
    });

    const instances = 10000;
    const matrix_size = 9;
    const attribute_transform_position = 3;
    const attributes_amount_for_mat3 = 3;
    const el_per_row_count_for_mat3 = 3;
    const transformation_data = new Float32Array(
      Array(matrix_size * instances)
    );

    const transformation_buffer = gl.createBuffer!();
    gl.bindBuffer(gl.ARRAY_BUFFER, transformation_buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      transformation_data.byteLength,
      gl.DYNAMIC_DRAW
    );

    const bytes_per_transform =
      Float32Array.BYTES_PER_ELEMENT *
      el_per_row_count_for_mat3 *
      attributes_amount_for_mat3;
    for (let i = 0; i < attributes_amount_for_mat3; i++) {
      const next_location = attribute_transform_position + i;
      gl.enableVertexAttribArray(next_location);
      // note the stride and offset
      const offset = i * Float32Array.BYTES_PER_ELEMENT * 3;
      gl.vertexAttribPointer(
        next_location, // location
        4, // size (num values to pull from buffer per iteration)
        gl.FLOAT, // type of data in buffer
        false, // normalize
        bytes_per_transform, // stride, num bytes to advance to get to next set of values
        offset // offset in buffer
      );
      // this line says this attribute only changes for each 1 instance
      gl.vertexAttribDivisor(next_location, 1);
    }

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return new SpriteInstancingMesh(
      vertices_buffer,
      uv_buffer,
      {
        buffer: transformation_buffer as WebGLBuffer,
        component_length: 9,
        count: 10000,
      },
      transformation_data,
      vao
    );
  }
}
