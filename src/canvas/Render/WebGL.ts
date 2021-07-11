import { Resource } from "@mr/ecs/World";
import { Shader, ShaderID } from "./Shader";
import { t } from "../WebGLUtils";
import { Mesh, MeshID } from "./Mesh";
import { Texture, TextureID } from "./Texture";

export class WebGL extends Resource {
  meshes = new Map<MeshID, Mesh>();
  shaders = new Map<ShaderID, Shader>();
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

    return new WebGL(gl);
  }

  constructor(public gl: WebGL2RenderingContext) {
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
}
