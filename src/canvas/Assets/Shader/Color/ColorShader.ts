import { Shader } from "../../../Render/Shader";
// @ts-ignore
import * as ColorVS from "./Color.vert";
// @ts-ignore
import * as ColorFS from "./Color.frag";

type Color = [R: number, G: number, B: number];

export class ColorShader extends Shader {
  constructor(
    program: WebGLProgram,
    public location: { Color: WebGLUniformLocation }
  ) {
    super(program);
  }

  static vertex_shader = ColorVS;
  static fragment_shader = ColorFS;

  static create(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    colors: [GREY: Color, RED: Color, GREE: Color, BLUE: Color]
  ) {
    gl.useProgram(program);
    const Color = gl.getUniformLocation(program, "u_Color");
    gl.uniform3fv(Color, colors.flat());
    gl.useProgram(null);

    if (Color) {
      return new ColorShader(program, { Color });
    } else {
      throw new Error(
        "[ColorShader -> create()] can't find u_Color location in shader"
      );
    }
  }

  static use(
    gl: WebGL2RenderingContext,
    shader: Shader,
    colors: [GREY: Color, RED: Color, GREE: Color, BLUE: Color]
  ) {
    if (shader instanceof ColorShader) {
      gl.useProgram(shader.program);
      gl.uniform3fv(shader.location.Color, colors.flat());
      gl.useProgram(null);
    } else {
      throw new Error(`[ColorShader -> use()] invalid shader type`);
    }
  }
}
