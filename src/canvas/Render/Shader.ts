import { Mesh } from "./Mesh";
import { t } from "./WebGLUtils";

export class ShaderID {
  // @ts-expect-error
  #type: ShaderID;
}

export abstract class Shader {
  id: ShaderID;
  info?: t.ProgramInfo;

  constructor(
    public program: WebGLProgram,
    // biome-ignore lint/suspicious/noExplicitAny: requried for extendability
    ...args: any[]
  ) {
    this.id = new ShaderID();
  }

  default_dispose(gl: WebGL2RenderingContext) {
    gl.deleteProgram(this.program);
  }

  abstract dispose(gl: WebGL2RenderingContext): void;
}

export namespace Shader {}
