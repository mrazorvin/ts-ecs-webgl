import { ScreenMesh } from "../Assets/View/Screen/Screen.mesh";
import { ScreenShader } from "../Assets/View/Screen/Screen.shader";
import { MeshID } from "./Mesh";
import { Shader, ShaderID } from "./Shader";
import { WebGL } from "./WebGL";

export class ContextID {
  #type = ContextID;
}

export class Context {
  render_buffer: WebGLRenderbuffer;
  frame_buffer: WebGLFramebuffer;
  texture: WebGLTexture;
  shader: ShaderID;
  mesh: MeshID;
  width: number;
  height: number;

  id = new ContextID();
  need_clear = false;

  constructor(
    params: Pick<
      Context,
      | "frame_buffer"
      | "render_buffer"
      | "shader"
      | "mesh"
      | "height"
      | "width"
      | "texture"
    >
  ) {
    this.shader = params.shader;
    this.mesh = params.mesh;
    this.width = params.width;
    this.height = params.height;
    this.render_buffer = params.render_buffer;
    this.frame_buffer = params.frame_buffer;
    this.texture = params.texture;
  }

  clear(gl: WebGL2RenderingContext) {
    gl.deleteRenderbuffer(this.render_buffer);
    gl.deleteFramebuffer(this.frame_buffer);
    gl.deleteTexture(this.texture);
  }
}

export namespace Context {
  export function create(
    gl: WebGL2RenderingContext,
    options: Pick<Context, "width" | "height" | "shader" | "mesh">
  ) {
    const render_buffer = gl.createRenderbuffer();
    const frame_buffer = gl.createFramebuffer();
    const texture = gl.createTexture();
    const all_runtime_exists = render_buffer && frame_buffer && texture;

    if (!all_runtime_exists) {
      throw new Error(
        `[${
          Context.name
        } -> create()] all runtime must present ${JSON.stringify({
          texture,
          render_buffer,
          frame_buffer,
        })}`
      );
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, frame_buffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, render_buffer);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    // TODO: Switch to RGBA_F16 - to support HDR
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      options.width,
      options.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );

    gl.renderbufferStorage(
      gl.RENDERBUFFER,
      gl.DEPTH_COMPONENT16,
      options.width,
      options.height
    );

    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      texture,
      0
    );

    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      gl.RENDERBUFFER,
      render_buffer
    );

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return new Context({
      texture,
      render_buffer,
      frame_buffer,
      ...options,
    });
  }

  export function render(ctx: WebGL, context: Context) {
    const shader = ctx.shaders.get(context.shader);
    const mesh = ctx.meshes.get(context.mesh);

    if (mesh instanceof ScreenMesh && shader instanceof ScreenShader) {
      const gl = ctx.gl;

      gl.useProgram(shader.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, context.texture);
      gl.uniform1i(shader.location.Image, 0);
      Shader.render_mesh(gl, mesh);
      gl.useProgram(null);
    } else {
      throw new Error(
        `[Screen -> render()] resource resolving problem, default context could render only Screen view`
      );
    }
  }
}
