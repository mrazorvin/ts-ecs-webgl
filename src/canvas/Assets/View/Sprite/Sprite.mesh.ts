import { Mesh } from "../../../Render/Mesh";
import { ShaderGlobals } from "../../../Render/ShaderGlobal";

export class SpriteMesh extends Mesh {
  uv_width = 0;
  uv_height = 0;
  frame_data = new Float32Array(2);

  constructor(
    mode: WebGL2RenderingContext["TRIANGLES"],
    vao: WebGLVertexArrayObject,
    buffers: {
      vertex: Mesh.Buffer | null;
      normal: Mesh.Buffer | null;
      index: Mesh.Buffer | null;
      uv: Mesh.Buffer | null;
    },
    public transform_buffer: WebGLBuffer,
    public frame_buffer: WebGLBuffer
  ) {
    super(mode, vao, buffers);
  }

  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}

export namespace SpriteMesh {
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
      attribute: ShaderGlobals.Attributes.Position,
    });

    const uv = Mesh.attribute_buffer(gl, {
      array: uv_rectangle,
      component_length: 2,
      attribute: ShaderGlobals.Attributes.UV,
    });

    const frame_buffer = gl.createBuffer()!;
    const frame_data = new Float32Array(2);
    if (frame_buffer == null) throw new Error(`[WebGLUtils.mesh.attribute_buffer()]`);
    gl.bindBuffer(gl.ARRAY_BUFFER, frame_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, frame_data, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(ShaderGlobals.a_Frame);
    gl.vertexAttribPointer(ShaderGlobals.a_Frame, 2, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(ShaderGlobals.a_Frame, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const attribute_transform_location = ShaderGlobals.a_Transformation;
    const attributes_amount_for_mat3 = 3;
    const el_per_row_count_for_mat3 = 3;
    const transformation_data = new Float32Array(el_per_row_count_for_mat3 * el_per_row_count_for_mat3);
    const transformation_buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, transformation_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, transformation_data.byteLength, gl.DYNAMIC_DRAW);
    const bytes_per_transform = Float32Array.BYTES_PER_ELEMENT * el_per_row_count_for_mat3 * attributes_amount_for_mat3;

    for (let i = 0; i < attributes_amount_for_mat3; i++) {
      const next_location = attribute_transform_location + i;
      gl.enableVertexAttribArray(next_location);
      // note the stride and offset
      const offset = i * Float32Array.BYTES_PER_ELEMENT * el_per_row_count_for_mat3;
      gl.vertexAttribPointer(
        next_location, // location
        el_per_row_count_for_mat3, // size (num values to pull from buffer per iteration)
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

    const rect = new SpriteMesh(
      gl.TRIANGLE_STRIP,
      vao,
      {
        vertex,
        uv,
        normal: null,
        index: null,
      },
      transformation_buffer,
      frame_buffer
    );

    rect.uv_height = uv_height;
    rect.uv_width = uv_width;

    return rect;
  }
}
