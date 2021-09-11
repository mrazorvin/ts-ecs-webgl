import { Shader, ShaderID } from "../../../Render/Shader";

// @ts-ignore
import * as LightVS from "./Light.vert";

// @ts-ignore
import * as LightFS from "./Light.frag";
import { t } from "../../../Render/WebGLUtils";
import { ShaderGlobals } from "../../../Render/ShaderGlobal";

export const LIGHT_SHADER = new ShaderID();

export class LightShader extends Shader {
  constructor(
    program: WebGLProgram,
    public location: {
      Transform: WebGLUniformLocation;
      Resolution: WebGLUniformLocation;
      WidthHeight: WebGLUniformLocation;
      Collisions: WebGLUniformLocation;
    }
  ) {
    super(program);
  }

  static create(gl: WebGL2RenderingContext) {
    const program = t.program(gl, [t.shader(gl, LightFS, "FRAGMENT"), t.shader(gl, LightVS, "VERTEX")], {
      layout_attributes: ShaderGlobals.Location,
    });

    gl.useProgram(program);
    const Transform = gl.getUniformLocation(program, "u_Transform");
    const Collisions = gl.getUniformLocation(program, "u_Collisions")!;
    const WidthHeight = gl.getUniformLocation(program, "u_WidthHeight")!;
    const Resolution = gl.getUniformLocation(program, "u_Resolution")!;
    gl.useProgram(null);

    if (Transform) {
      return new LightShader(program, { Transform, WidthHeight, Resolution, Collisions });
    } else {
      throw new Error(
        `[${LightShader.name} -> create()] -> 
          all locations must be valid ${JSON.stringify({ Transform, WidthHeight, Resolution, Collisions })}`
      );
    }
  }

  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}
