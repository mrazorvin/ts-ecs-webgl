import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as SpriteInstancingVS from "./SpriteInstancing.vert";

// @ts-ignore
import * as SpriteInstancingFS from "./SpriteInstancing.frag";

export const SPRITE_SHADER = new ShaderID();

export class SpriteInstancingShader extends Shader {
  constructor(
    program: WebGLProgram,
    public location: { Image: WebGLUniformLocation }
  ) {
    super(program);
  }

  static vertex_shader = SpriteInstancingVS;
  static fragment_shader = SpriteInstancingFS;

  static create(gl: WebGL2RenderingContext, program: WebGLProgram) {
    gl.useProgram(program);
    const Image = gl.getUniformLocation(program, "u_Image");
    gl.useProgram(null);

    if (Image) {
      return new SpriteInstancingShader(program, { Image });
    } else {
      throw new Error(
        `[${this.name} -> create()] -> 
          all locations must be valid ${JSON.stringify({ Image })}`
      );
    }
  }
}
