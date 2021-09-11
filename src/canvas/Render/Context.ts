import { ScreenMesh } from "../Assets/View/Screen/Screen.mesh";
import { ScreenShader } from "../Assets/View/Screen/Screen.shader";
import { MeshID } from "./Mesh";
import { Shader, ShaderID } from "./Shader";
import { WebGL } from "./WebGL";

export class ContextID {
  // @ts-expect-error
  #type: ContextID;
}

export abstract class Context {
  render_buffer: WebGLRenderbuffer;
  frame_buffer: WebGLFramebuffer;
  texture: WebGLTexture;
  shader: ShaderID;
  mesh: MeshID;
  width: number;
  height: number;
  layers: number;

  id: ContextID;
  need_clear: boolean;

  constructor(
    params: Pick<
      Context,
      "frame_buffer" | "render_buffer" | "shader" | "mesh" | "height" | "width" | "texture" | "layers"
    >
  ) {
    this.id = new ContextID();
    this.need_clear = false;
    this.shader = params.shader;
    this.mesh = params.mesh;
    this.width = params.width;
    this.height = params.height;
    this.render_buffer = params.render_buffer;
    this.frame_buffer = params.frame_buffer;
    this.texture = params.texture;
    this.layers = params.layers;
  }

  default_dispose(gl: WebGL2RenderingContext) {
    gl.deleteRenderbuffer(this.render_buffer);
    gl.deleteFramebuffer(this.frame_buffer);
    gl.deleteTexture(this.texture);
  }

  abstract dispose(gl: WebGL2RenderingContext): void;
}

class DefaultContext extends Context {
  dispose(gl: WebGL2RenderingContext) {
    this.default_dispose(gl);
  }
}

export namespace Context {
  export function create(
    gl: WebGL2RenderingContext,
    options: Pick<Context, "width" | "height" | "shader" | "mesh"> & {
      mag_filter?: typeof gl.LINEAR | typeof gl.NEAREST;
      layers?: number;
    }
  ) {
    const render_buffer = gl.createRenderbuffer();
    const frame_buffer = gl.createFramebuffer();
    const texture = gl.createTexture();
    const all_runtime_exists = render_buffer && frame_buffer && texture;
    const layers = options.layers ?? 1;

    if (!all_runtime_exists) {
      throw new Error(
        `[${Context.name} -> create()] all runtime must present ${JSON.stringify({
          texture,
          render_buffer,
          frame_buffer,
        })}`
      );
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, frame_buffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, render_buffer);

    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    // TODO: Switch to RGBA_F16 - to support HDR
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, options.width, options.height, layers);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, options.mag_filter ?? gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, options.mag_filter ?? gl.NEAREST);

    let attachments: number[] = [];
    for (let i = 0; i < layers; i++) {
      attachments.push(gl.COLOR_ATTACHMENT0 + i);
      gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, texture, 0, i);
    }

    gl.drawBuffers(attachments);

    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, render_buffer);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, options.width, options.height);

    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return new DefaultContext({
      texture,
      render_buffer,
      frame_buffer,
      ...options,
      layers,
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
      throw new Error(`[Screen -> render()] resource resolving problem, default context could render only Screen view`);
    }
  }
}
