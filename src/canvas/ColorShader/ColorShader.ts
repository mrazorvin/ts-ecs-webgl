import { Shader } from "../Render/Shader";
// @ts-ignore
import * as ColorVS from "./Color.vert";
// @ts-ignore
import * as ColorFS from "./Color.frag";

export class ColorShader extends Shader {
  constructor(
    program: WebGLProgram,
    public location: {
      PointSize: WebGLUniformLocation;
      Angle: WebGLUniformLocation;
    }
  ) {
    super(program);
  }

  static vertex_shader = ColorVS;
  static fragment_shader = ColorFS;

  static create(gl: WebGL2RenderingContext, program: WebGLProgram) {
    gl.useProgram(program);
    const PointSize = gl.getUniformLocation(program, "u_PointSize");
    const Angle = gl.getUniformLocation(program, "u_Angle");
    gl.useProgram(null);

    if (PointSize && Angle) {
      return new ColorShader(program, { PointSize, Angle });
    }

    throw new Error(`[ColorShader -> create()] can't create ColorShader`);
  }

  static use(
    gl: WebGL2RenderingContext,
    shader: Shader,
    size: number,
    angle: number
  ) {
    if (shader instanceof ColorShader) {
      gl.useProgram(shader.program);
      gl.uniform1f(shader.location.PointSize, size);
      gl.uniform1f(shader.location.Angle, angle);
      gl.useProgram(null);
    } else {
      throw new Error(`[ColorShader -> use()] invalid shader type`);
    }
  }
}
