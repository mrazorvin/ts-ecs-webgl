import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as SpriteVS from "./Sprite.vert";

// @ts-ignore
import * as SpriteFS from "./Sprite.frag";
import { t } from "../../../Render/WebGLUtils";
import { ShaderGlobals } from "../../../Render/ShaderGlobal";

export const SPRITE_SHADER = new ShaderID();

export class SpriteShader extends Shader {
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

  static vertex_shader = SpriteVS;
  static fragment_shader = SpriteFS;

  static create(gl: WebGL2RenderingContext) {
    const program = t.program(gl, [t.shader(gl, SpriteFS, "FRAGMENT"), t.shader(gl, SpriteVS, "VERTEX")], {
      layout_attributes: ShaderGlobals.Location,
    });

    gl.useProgram(program);
    const Image = gl.getUniformLocation(program, "u_Image");
    const Frame = gl.getUniformLocation(program, "u_Frame");
    const Transform = gl.getUniformLocation(program, "u_Transform");
    gl.useProgram(null);

    if (Image && Transform && Frame) {
      return new SpriteShader(program, { Image, Transform, Frame });
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

  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}
