import { Resource } from "@mr/ecs/World";
import { Shader, ShaderID } from "./Shader";
import { Mesh, MeshID } from "./Mesh";
import { Texture, TextureID } from "./Texture";
import { Context, ContextID } from "./Context";
import { ScreenShader, SCREEN_SHADER } from "../Assets/View/Screen/Screen.shader";
import { ScreenMesh, SCREEN_MESH } from "../Assets/View/Screen/Screen.mesh";

export class WebGL extends Resource {
  // use array's instead of map for faster lookup
  meshes = new Map<MeshID, Mesh>();
  shaders = new Map<ShaderID, Shader>();
  context = new Map<ContextID, Context>();
  textures = new Map<TextureID, Texture>();

  static setup(document: Document, selector: string) {
    const target = document.getElementById(selector);
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2", {
      antialias: false,
      desynchronized: true,
      stencil: false,
      depth: false,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    if (gl == null) {
      const msg = "Can't create WebGL2 rendering context";
      window.alert(msg);
      throw new Error(msg);
    }

    target?.appendChild(canvas);

    return new WebGL(gl, canvas);
  }

  constructor(public gl: WebGL2RenderingContext, public canvas: HTMLCanvasElement) {
    super();
  }

  create_mesh<T extends Mesh>(factory: (gl: WebGL2RenderingContext) => T, options: { id?: MeshID }) {
    const mesh: T = factory(this.gl);
    if (options.id !== undefined) mesh.id = options.id;

    this.meshes.set(mesh.id, mesh);

    return { id: mesh.id, mesh };
  }

  create_shader(factory: (gl: WebGL2RenderingContext) => Shader, options: { id?: ShaderID }) {
    const shader = factory(this.gl);
    if (options.id !== undefined) shader.id = options.id;

    this.shaders.set(shader.id, shader);

    return { id: shader.id, shader };
  }

  create_texture(
    image: HTMLImageElement,
    factory: (gl: WebGL2RenderingContext, image: HTMLImageElement) => Texture,
    id?: TextureID
  ) {
    const texture = factory(this.gl, image);
    if (id !== undefined) texture.id = id;

    this.textures.set(texture.id, texture);

    return { id: texture.id, texture };
  }

  create_context(
    id: ContextID,
    options: Pick<Context, "width" | "height"> & Partial<Pick<Context, "shader" | "mesh"> & { layers?: number }>,
    factory: (gl: WebGL2RenderingContext, params: Parameters<typeof Context.create>[1]) => Context
  ) {
    const prev = this.context.get(id);
    if (prev) {
      prev.dispose(this.gl);
    }

    if (!this.shaders.has(SCREEN_SHADER)) {
      this.create_shader(ScreenShader.create, { id: SCREEN_SHADER });
      this.create_mesh(ScreenMesh.create_screen, { id: SCREEN_MESH });
    }

    const context = factory(this.gl, {
      shader: options.shader ?? SCREEN_SHADER,
      mesh: options.mesh ?? SCREEN_MESH,
      ...options,
    });
    context.id = id;
    this.context.set(id, context);

    return { id: context.id, context };
  }

  dispose() {
    for (const shader of this.shaders.values()) {
      shader.dispose(this.gl);
    }
    this.shaders.clear();

    for (const mesh of this.meshes.values()) {
      mesh.dispose(this.gl);
    }
    this.meshes.clear();

    for (const context of this.context.values()) {
      context.dispose(this.gl);
    }
    this.context.clear();

    for (const texture of this.textures.values()) {
      texture.dispose(this.gl);
    }
    this.context.clear();

    this.canvas.remove();
    // @ts-expect-error
    this.canvas = null;
    // @ts-expect-error
    this.gl = null;
  }
}
