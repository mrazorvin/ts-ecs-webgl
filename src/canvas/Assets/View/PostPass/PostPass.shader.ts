import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as PostPassVS from "./PostPass.vert";

// @ts-ignore
import * as PostPassFS from "./PostPass.frag";

export const POST_PASS_SHADER = new ShaderID();

export class PostPassShader extends Shader {
  constructor(
    program: WebGLProgram,
    public location: { Image: WebGLUniformLocation }
  ) {
    super(program);
  }

  static vertex_shader = PostPassVS;
  static fragment_shader = PostPassFS;

  static create(gl: WebGL2RenderingContext, program: WebGLProgram) {
    gl.useProgram(program);
    const Image = gl.getUniformLocation(program, "u_Image");
    gl.useProgram(null);

    if (Image) {
      return new PostPassShader(program, { Image });
    } else {
      throw new Error(
        `[${this.name} -> create()] -> 
          all locations must be valid ${JSON.stringify({ Image })}`
      );
    }
  }
}
