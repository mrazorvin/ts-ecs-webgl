import { ShaderGlobals } from "./ShaderGlobal";

type RenderMode = WebGL2RenderingContext["TRIANGLES"] | WebGL2RenderingContext["TRIANGLE_STRIP"];

export abstract class Mesh {
  mode: RenderMode;
  vao: WebGLVertexArrayObject;

  vertex: Mesh.Buffer | null;
  normal: Mesh.Buffer | null;
  index: Mesh.Buffer | null;
  uv: Mesh.Buffer | null;

  id: MeshID;

  disable_culling = false;
  enable_blending = false;

  constructor(
    mode: RenderMode,
    vao: WebGLVertexArrayObject,
    buffers: {
      vertex: Mesh.Buffer | null;
      normal: Mesh.Buffer | null;
      index: Mesh.Buffer | null;
      uv: Mesh.Buffer | null;
    },
    public settings?: {
      vertices_per_instaces: number;
      instances_count: number;
    },
  ) {
    this.mode = mode;
    this.vao = vao;
    this.index = buffers.index;
    this.vertex = buffers.vertex;
    this.normal = buffers.normal;
    this.uv = buffers.uv;
    this.id = new MeshID();
  }

  default_dispose(gl: WebGL2RenderingContext) {
    const buffers = [this.vertex, this.normal, this.uv];
    for (const buffer of buffers) {
      if (buffer === null) continue;
      const gl_buffer = buffer.buffer;
      gl.bindBuffer(gl.ARRAY_BUFFER, gl_buffer);
      gl.bufferData(gl.ARRAY_BUFFER, 1, gl.STATIC_DRAW);
      gl.deleteBuffer(gl_buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    const gl_buffer = this.index?.buffer;
    if (gl_buffer !== null && gl_buffer !== undefined) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl_buffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, 1, gl.STATIC_DRAW);
      gl.deleteBuffer(gl_buffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    if (this.vao !== null) {
      gl.deleteVertexArray(this.vao);
    }
  }

  render(gl: WebGL2RenderingContext, fn?: (gl: WebGL2RenderingContext) => unknown) {
    gl.bindVertexArray(this.vao);

    if (this.disable_culling) {
      gl.disable(gl.CULL_FACE);
    }

    if (this.enable_blending) {
      gl.enable(gl.BLEND);
    }

    fn?.(gl);
    if (this.index?.count) {
      gl.drawElementsInstanced(this.mode, this.index.count, gl.UNSIGNED_SHORT, 0, this.settings?.instances_count ?? 1);
    } else if (this.vertex?.count) {
      gl.drawArraysInstanced(
        this.mode,
        0, // offset
        this.settings?.vertices_per_instaces ?? 6,
        this.settings?.instances_count ?? 1,
      );
    } else {
      throw new Error(`[Shader -> render_model()] Can't render model without index and vertex buffer`);
    }

    if (this.disable_culling) {
      gl.enable(gl.CULL_FACE);
    }

    if (this.enable_blending) {
      gl.disable(gl.BLEND);
    }

    gl.bindVertexArray(null);
  }

  abstract dispose(gl: WebGL2RenderingContext): void;
}

export class MeshID {
  // @ts-expect-error
  #type: MeshID;
}

export namespace Mesh {
  export interface Buffer {
    count: number;
    data: Float32Array | Uint16Array;
    buffer: WebGLBuffer;
    component_length: number;
  }

  export function attribute_buffer(
    gl: WebGL2RenderingContext,
    data: {
      attribute: ShaderGlobals.Attributes;
      array: Float32Array;
      component_length: number;
      stride?: number;
    },
  ): Buffer {
    const buffer = gl.createBuffer();
    const count = data.array.length / data.component_length;

    if (buffer == null) {
      throw new Error(`[WebGLUtils.mesh.attribute_buffer()] can't create buffer`);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.array, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(ShaderGlobals.AllLocations[data.attribute]);
    gl.vertexAttribPointer(
      ShaderGlobals.AllLocations[data.attribute],
      data.component_length,
      gl.FLOAT,
      false,
      data.stride ?? 0,
      0,
    );

    return {
      count,
      buffer,
      component_length: data.component_length,
      data: data.array,
    };
  }

  export function divisor_attribute_buffer(
    gl: WebGL2RenderingContext,
    ext: ANGLE_instanced_arrays,
    data: {
      location: number;
      array: Float32Array;
      component_length: number;
    },
  ): Buffer {
    const buffer = gl.createBuffer();
    const count = data.array.length / data.component_length;

    if (buffer == null) {
      throw new Error(`[WebGLUtils.mesh.attribute_buffer()] can't create buffer`);
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data.array, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(data.location);
    gl.vertexAttribPointer(data.location, data.component_length, gl.FLOAT, false, 0, 0);
    ext.vertexAttribDivisorANGLE(data.location, 1);

    return {
      count,
      buffer,
      component_length: data.component_length,
      data: data.array,
    };
  }

  export function index_buffer(
    gl: WebGL2RenderingContext,
    data: {
      array: Uint16Array;
    },
  ): Buffer {
    const buffer = gl.createBuffer();
    const count = data.array.length;

    if (buffer == null) {
      throw new Error(`[WebGLUtils.mesh.index_buffer()] can't create buffer`);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.array, gl.STATIC_DRAW);

    return { count, buffer, component_length: 1, data: data.array };
  }
}
