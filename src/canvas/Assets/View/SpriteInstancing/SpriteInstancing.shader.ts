import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as SpriteInstancingVS from "./SpriteInstancing.vert";

// @ts-ignore
import * as SpriteInstancingFS from "./SpriteInstancing.frag";
import { t } from "../../../Render/WebGLUtils";
import { ShaderGlobals } from "../../../Render/ShaderGlobal";

export const SPRITE_SHADER = new ShaderID();

export class SpriteInstancingShader extends Shader {
  constructor(program: WebGLProgram, public location: { Image: WebGLUniformLocation }) {
    super(program);
  }

  static create(gl: WebGL2RenderingContext) {
    const program = t.program(
      gl,
      [t.shader(gl, SpriteInstancingFS, "FRAGMENT"), t.shader(gl, SpriteInstancingVS, "VERTEX")],
      { layout_attributes: ShaderGlobals.Location }
    );

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

  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}
