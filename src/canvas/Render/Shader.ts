import { Mesh } from "./Mesh";

export class Shader {
  id = new ShaderID();
  constructor(public program: WebGLProgram, ...args: any[]) {}
}

export class ShaderID {
  #type = ShaderID;
}

export namespace Shader {
  export function render_mesh(
    gl: WebGL2RenderingContext,
    shader: Shader,
    mesh: Mesh
  ) {
    gl.useProgram(shader.program);
    gl.bindVertexArray(mesh.vao);
    if (mesh.index?.count) {
      gl.drawElements(mesh.mode, mesh.index.count, gl.UNSIGNED_SHORT, 0);
    } else if (mesh.vertex?.count) {
      gl.drawArrays(mesh.mode, 0, mesh.vertex?.count);
    } else {
      throw new Error(
        `[Shader -> render_model()] Can't render model without index and vertex buffer`
      );
    }
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }
}
