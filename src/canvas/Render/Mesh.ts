import { ShaderGlobals } from "./ShaderGlobal";

export class Mesh {
  mode: WebGL2RenderingContext["TRIANGLES"];
  vao: WebGLVertexArrayObject;

  vertex: Mesh.Buffer | null;
  normal: Mesh.Buffer | null;
  index: Mesh.Buffer | null;
  uv: Mesh.Buffer | null;

  id: MeshID;

  constructor(
    mode: WebGL2RenderingContext["TRIANGLES"],
    vao: WebGLVertexArrayObject,
    buffers: {
      vertex: Mesh.Buffer | null;
      normal: Mesh.Buffer | null;
      index: Mesh.Buffer | null;
      uv: Mesh.Buffer | null;
    }
  ) {
    this.mode = mode;
    this.vao = vao;
    this.index = buffers.index;
    this.vertex = buffers.vertex;
    this.normal = buffers.normal;
    this.uv = buffers.uv;
    this.id = new MeshID();
  }
}

export class MeshID {
  #type = MeshID;
}

export namespace Mesh {
  export interface Buffer {
    count: number;
    buffer: WebGLBuffer;
    component_length: number;
  }

  export function create(
    gl: WebGL2RenderingContext,
    data: {
      index?: Uint16Array;
      vertexes: Float32Array;
      normal?: Float32Array;
      uv?: Float32Array;
    }
  ): Mesh {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    if (vao == null) {
      throw new Error(`[WebGLUtils.mesh.vao()] can't create array buffer`);
    }

    const vertex = data.vertexes
      ? attribute_buffer(gl, {
          array: data.vertexes,
          component_length: 3,
          attribute: ShaderGlobals.Attribute.Position,
        })
      : null;
    const normal = data.normal
      ? attribute_buffer(gl, {
          array: data.normal,
          component_length: 3,
          attribute: ShaderGlobals.Attribute.Normal,
        })
      : null;
    const uv = data.uv
      ? attribute_buffer(gl, {
          array: data.uv,
          component_length: 2,
          attribute: ShaderGlobals.Attribute.UV,
        })
      : null;
    const index = data.index
      ? index_buffer(gl, { array: data.index, component_length: 1 })
      : null;

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return new Mesh(gl.TRIANGLE_STRIP, vao, {
      vertex,
      normal,
      uv,
      index,
    });
  }

  export function attribute_buffer(
    gl: WebGL2RenderingContext,
    data: {
      attribute: ShaderGlobals.Attribute;
      array: Float32Array;
      component_length: number;
    }
  ): Buffer {
    const buffer = gl.createBuffer();
    const count = data.array.length / data.component_length;

    if (buffer == null) {
      throw new Error(
        `[WebGLUtils.mesh.attribute_buffer()] can't create buffer`
      );
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.array, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(ShaderGlobals.Location[data.attribute]);
    gl.vertexAttribPointer(
      ShaderGlobals.Location[data.attribute],
      data.component_length,
      gl.FLOAT,
      false,
      0,
      0
    );

    return {
      count,
      buffer,
      component_length: data.component_length,
    };
  }

  export function divisor_attribute_buffer(
    gl: WebGL2RenderingContext,
    ext: ANGLE_instanced_arrays,
    data: {
      location: number;
      array: Float32Array;
      component_length: number;
    }
  ): Buffer {
    const buffer = gl.createBuffer();
    const count = data.array.length / data.component_length;

    if (buffer == null) {
      throw new Error(
        `[WebGLUtils.mesh.attribute_buffer()] can't create buffer`
      );
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.array, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(data.location);
    gl.vertexAttribPointer(
      data.location,
      data.component_length,
      gl.FLOAT,
      false,
      0,
      0
    );
    ext.vertexAttribDivisorANGLE(data.location, 1);

    return {
      count,
      buffer,
      component_length: data.component_length,
    };
  }

  export function index_buffer(
    gl: WebGL2RenderingContext,
    data: {
      array: Uint16Array;
      component_length: number;
    }
  ): Buffer {
    const buffer = gl.createBuffer();
    const count = data.array.length / data.component_length;

    if (buffer == null) {
      throw new Error(`[WebGLUtils.mesh.index_buffer()] can't create buffer`);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.array, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    return { count, buffer, component_length: data.component_length };
  }
}
