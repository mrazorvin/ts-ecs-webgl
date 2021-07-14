import { Resource } from "@mr/ecs/World";
import { Shader, ShaderID } from "./Shader";
import { t } from "./WebGLUtils";
import { Mesh, MeshID } from "./Mesh";
import { Texture, TextureID } from "./Texture";
import { Context, ContextID } from "./Context";
import {
  ScreenShader,
  SCREEN_SHADER,
} from "../Assets/View/Screen/Screen.shader";
import { ScreenMesh, SCREEN_MESH } from "../Assets/View/Screen/Screen.mesh";

export class WebGL extends Resource {
  meshes = new Map<MeshID, Mesh>();
  shaders = new Map<ShaderID, Shader>();
  context = new Map<ContextID, Context>();
  textures = new Map<TextureID, Texture>();

  static setup(document: Document, selector: string) {
    const target = document.getElementById(selector);
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (gl == null) {
      const msg = "Can't create WebGL2 rendering context";
      window.alert(msg);
      throw new Error(msg);
    }

    target?.appendChild(canvas);

    return new WebGL(gl, canvas);
  }

  constructor(
    public gl: WebGL2RenderingContext,
    public canvas: HTMLCanvasElement
  ) {
    super();
  }

  create_mesh(factory: (gl: WebGL2RenderingContext) => Mesh, id?: MeshID) {
    const mesh = factory(this.gl);
    if (id != null) mesh.id = id;

    this.meshes.set(mesh.id, mesh);

    return mesh.id;
  }

  create_shader(
    fragment_shader: string,
    vertex_shader: string,
    factory: (gl: WebGL2RenderingContext, shader: WebGLProgram) => Shader,
    id?: ShaderID
  ) {
    const shader = factory(
      this.gl,
      t.program(this.gl, [
        t.shader(this.gl, fragment_shader, "FRAGMENT"),
        t.shader(this.gl, vertex_shader, "VERTEX"),
      ])
    );
    if (id != null) shader.id = id;

    this.shaders.set(shader.id, shader);

    return shader.id;
  }

  create_texture(
    image: HTMLImageElement,
    factory: (gl: WebGL2RenderingContext, image: HTMLImageElement) => Texture,
    id?: TextureID
  ) {
    const texture = factory(this.gl, image);
    if (id != null) texture.id = id;

    this.textures.set(texture.id, texture);

    return texture.id;
  }

  create_context(
    id: ContextID,
    options: Pick<Context, "width" | "height"> &
      Partial<Pick<Context, "shader" | "mesh">>,
    factory: (
      gl: WebGL2RenderingContext,
      params: Parameters<typeof Context.create>[1]
    ) => Context
  ) {
    const prev = this.context.get(id);
    if (prev) {
      prev.clear(this.gl);
    }

    if (!this.shaders.has(SCREEN_SHADER)) {
      this.create_shader(
        ScreenShader.fragment_shader,
        ScreenShader.vertex_shader,
        ScreenShader.create,
        SCREEN_SHADER
      );

      this.create_mesh(ScreenMesh.create_screen, SCREEN_MESH);
    }

    const context = factory(this.gl, {
      shader: options.shader ?? SCREEN_SHADER,
      mesh: options.mesh ?? SCREEN_MESH,
      ...options,
    });
    context.id = id;
    this.context.set(id, context);

    return context.id;
  }
}
