import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as PostPassVS from "./PostPass.vert";

// @ts-ignore
import * as PostPassFS from "./PostPass.frag";
import { t } from "../../../Render/WebGLUtils";
import { ShaderGlobals } from "../../../Render/ShaderGlobal";

export const POST_PASS_SHADER = new ShaderID();

export class PostPassShader extends Shader {
  constructor(program: WebGLProgram, public location: { Image: WebGLUniformLocation }) {
    super(program);
  }

  static create(gl: WebGL2RenderingContext) {
    const program = t.program(gl, [t.shader(gl, PostPassFS, "FRAGMENT"), t.shader(gl, PostPassVS, "VERTEX")], {
      layout_attributes: ShaderGlobals.Location,
    });

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

  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}
