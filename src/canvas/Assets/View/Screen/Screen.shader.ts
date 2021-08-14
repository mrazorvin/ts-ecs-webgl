import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as ScreenVS from "./Screen.vert";

// @ts-ignore
import * as ScreenFS from "./Screen.frag";

export const SCREEN_SHADER = new ShaderID();

export class ScreenShader extends Shader {
  constructor(program: WebGLProgram, public location: { Image: WebGLUniformLocation }) {
    super(program);
  }

  static vertex_shader = ScreenVS;
  static fragment_shader = ScreenFS;

  static create(gl: WebGL2RenderingContext, program: WebGLProgram) {
    gl.useProgram(program);
    const Image = gl.getUniformLocation(program, "u_Image");
    gl.useProgram(null);

    if (Image) {
      return new ScreenShader(program, { Image });
    } else {
      throw new Error(
        `[${this.name} -> create()] -> 
          all locations must be valid ${JSON.stringify({ Image })}`
      );
    }
  }

  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}
