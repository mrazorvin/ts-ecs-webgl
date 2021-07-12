import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as ScreenVS from "./Screen.vert";

// @ts-ignore
import * as ScreenFS from "./Screen.frag";

export const SCREEN_SHADER = new ShaderID();

export class ScreenShader extends Shader {
  constructor(
    program: WebGLProgram,
    public location: {
      Image: WebGLUniformLocation;
      Transform: WebGLUniformLocation;
      Frame: WebGLUniformLocation;
    }
  ) {
    super(program);
  }

  static vertex_shader = ScreenVS;
  static fragment_shader = ScreenFS;

  static create(gl: WebGL2RenderingContext, program: WebGLProgram) {
    gl.useProgram(program);
    const Image = gl.getUniformLocation(program, "u_Image");
    const Frame = gl.getUniformLocation(program, "u_Frame");
    const Transform = gl.getUniformLocation(program, "u_Transform");

    gl.useProgram(null);

    if (Image && Transform && Frame) {
      return new ScreenShader(program, { Image, Transform, Frame });
    } else {
      throw new Error(
        `[${this.name} -> create()] -> 
          all locations must be valid ${JSON.stringify({
            Image,
            Transform,
            Frame,
          })}`
      );
    }
  }
}
