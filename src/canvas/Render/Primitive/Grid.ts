import { Mesh } from "../Mesh";
import { ShaderGlobal } from "../ShaderGlobal";

export class Grid extends Mesh {}
export namespace Grid {
  export function create(gl: WebGL2RenderingContext): Grid {
    const vao = gl.createVertexArray();
    const buffer = gl.createBuffer();
    if (!vao || !buffer) {
      throw new Error(`[Grid -> create()] can't create vao buffer`);
    }

    const lines: Array<[x: number, y: number, z: number, color: number]> = [];
    const vew_size = 1.8;
    const half_view_size = vew_size / 2;
    const steps_amount = 10;
    const step = vew_size / steps_amount;
    for (let i = 0; i <= steps_amount; i++) {
      const vertical_pos = -half_view_size + i * step;
      lines.push([vertical_pos, half_view_size, 0, 0]);
      lines.push([vertical_pos, -half_view_size, 0, 1]);

      const horizontal_pos = half_view_size - i * step;
      lines.push([-half_view_size, horizontal_pos, 0, 0]);
      lines.push([half_view_size, horizontal_pos, 0, 1]);
    }

    lines.push([-half_view_size, -half_view_size, 0, 2]);
    lines.push([half_view_size, half_view_size, 0, 2]);

    lines.push([-half_view_size, half_view_size, 0, 3]);
    lines.push([half_view_size, -half_view_size, 0, 3]);

    const data = lines.flat();

    const pos_attr_len = 3;
    const pos_attr_loc = ShaderGlobal.Location[ShaderGlobal.Attribute.Position];
    const color_attr_len = 1;
    const color_attr_loc = 4;

    const data_component_length = pos_attr_len + color_attr_len;
    const stride_len = Float32Array.BYTES_PER_ELEMENT * data_component_length;

    gl.bindVertexArray(vao);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(pos_attr_loc);
    gl.enableVertexAttribArray(color_attr_loc);

    gl.vertexAttribPointer(
      pos_attr_loc,
      pos_attr_len,
      gl.FLOAT,
      false,
      stride_len,
      0
    );

    gl.vertexAttribPointer(
      color_attr_loc,
      color_attr_len,
      gl.FLOAT,
      false,
      stride_len,
      Float32Array.BYTES_PER_ELEMENT * pos_attr_len
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    return new Grid(gl.LINES, vao, {
      vertex: {
        buffer,
        component_length: data_component_length,
        count: data.length / data_component_length,
      },
      uv: null,
      index: null,
      normal: null,
    });
  }
}
