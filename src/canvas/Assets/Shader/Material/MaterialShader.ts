import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as MaterialVS from "./Material.vert";

// @ts-ignore
import * as MaterialFS from "./Material.frag";

console.log(MaterialFS);

export const MATERIAL_SHADER = new ShaderID();

export class MaterialShader extends Shader {
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

  static vertex_shader = MaterialVS;
  static fragment_shader = MaterialFS;

  static create(gl: WebGL2RenderingContext, program: WebGLProgram) {
    gl.useProgram(program);
    const Image = gl.getUniformLocation(program, "u_Image");
    const Frame = gl.getUniformLocation(program, "u_Frame");
    const Transform = gl.getUniformLocation(program, "u_Transform");

    gl.useProgram(null);

    if (Image && Transform && Frame) {
      return new MaterialShader(program, { Image, Transform, Frame });
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
