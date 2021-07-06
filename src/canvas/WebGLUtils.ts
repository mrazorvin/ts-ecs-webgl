import { ShaderGlobal } from "./Render/ShaderGlobal";

export namespace t {
  export function clear(
    gl: WebGL2RenderingContext,
    color?: [number, number, number, number]
  ) {
    if (color) gl.clearColor(...color);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    return gl;
  }

  export function size(
    gl: WebGL2RenderingContext,
    width: number,
    height: number
  ) {
    const canvas = gl.canvas as HTMLCanvasElement;

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    canvas.width = width;
    canvas.height = height;

    gl.viewport(0, 0, width, height);

    return gl;
  }

  export function shader(
    gl: WebGL2RenderingContext,
    src: string,
    type: "VERTEX" | "FRAGMENT"
  ) {
    const shader = gl.createShader(
      type === "VERTEX" ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER
    )!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const msg = `can't compile shader`;
      console.error(msg, src, gl.getShaderInfoLog(shader));
      throw new Error(msg);
    }

    return shader;
  }

  export function program(gl: WebGL2RenderingContext, shaders: WebGLShader[]) {
    const program = gl.createProgram()!;
    for (const shader of shaders) {
      gl.attachShader(program, shader);
    }

    gl.bindAttribLocation(
      program,
      ShaderGlobal.Location[ShaderGlobal.Attribute.Position],
      ShaderGlobal.Attribute.Position
    );

    gl.bindAttribLocation(
      program,
      ShaderGlobal.Location[ShaderGlobal.Attribute.Normal],
      ShaderGlobal.Attribute.Normal
    );

    gl.bindAttribLocation(
      program,
      ShaderGlobal.Location[ShaderGlobal.Attribute.UV],
      ShaderGlobal.Attribute.UV
    );

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const msg = "Can't compile program";
      window.alert(msg);
      console.error(msg, gl.getProgramInfoLog(program));
      throw new Error(msg);
    }

    for (const shader of shaders) {
      gl.deleteShader(shader);
      gl.detachShader(program, shader);
    }

    return program;
  }

  export function get_standard_attributes_location(
    gl: WebGL2RenderingContext,
    program: WebGLProgram
  ) {
    return {
      position: gl.getAttribLocation(program, ShaderGlobal.Attribute.Position),
      normal: gl.getAttribLocation(program, ShaderGlobal.Attribute.Normal),
      uv: gl.getAttribLocation(program, ShaderGlobal.Attribute.UV),
    };
  }

  export namespace buffer {
    export function array(
      gl: WebGL2RenderingContext,
      array: Float32Array,
      is_static = true
    ) {
      const buffer = gl.createBuffer();

      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        array,
        is_static ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW
      );
      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      return buffer;
    }
  }
}
