import { Context, ContextID } from "../../../Render/Context";
import { Shader } from "../../../Render/Shader";
import { WebGL } from "../../../Render/WebGL";
import { ScreenMesh } from "../Screen/Screen.mesh";
import { PostPassShader } from "./PostPass.shader";

export const POST_PASS_CONTEXT = new ContextID();

export class PostPass extends Context {
  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}

export namespace PostPass {
  export function render(ctx: WebGL, context: Context) {
    const shader = ctx.shaders.get(context.shader);
    const mesh = ctx.meshes.get(context.mesh);

    if (mesh instanceof ScreenMesh && shader instanceof PostPassShader) {
      const gl = ctx.gl;

      gl.useProgram(shader.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, context.texture);
      gl.uniform1i(shader.location.Image, 0);
      Shader.render_mesh(gl, mesh);
      gl.useProgram(null);
    } else {
      throw new Error(`[${PostPass.name} -> render()] resource resolving problem`);
    }
  }

  export function create(...args: Parameters<typeof Context.create>) {
    const context = Context.create(...args);
    return new PostPass(context);
  }
}
