import { Mesh } from "./Mesh";

export class ShaderID {
  // @ts-expect-error
  #type: ShaderID;
}

export abstract class Shader {
  id: ShaderID;

  constructor(public program: WebGLProgram, ...args: any[]) {
    this.id = new ShaderID();
  }

  default_dispose(gl: WebGL2RenderingContext) {
    gl.deleteProgram(this.program);
  }

  abstract dispose(gl: WebGL2RenderingContext): void;
}

export namespace Shader {
  export function render_mesh(gl: WebGL2RenderingContext, mesh: Mesh) {
    gl.bindVertexArray(mesh.vao);
    if (mesh.index?.count) {
      gl.drawElements(mesh.mode, mesh.index.count, gl.UNSIGNED_SHORT, 0);
    } else if (mesh.vertex?.count) {
      gl.drawArrays(mesh.mode, 0, mesh.vertex?.count);
    } else {
      throw new Error(`[Shader -> render_model()] Can't render model without index and vertex buffer`);
    }
    gl.bindVertexArray(null);
  }
}
