import { ComponentID, Resource } from "@mr/ecs/World";
import { Shader as program, ShaderID } from "./Shader";
import { t } from "../WebGLUtils";
import { Mesh } from "./Mesh";

export class WebGL extends Resource {
  meshes = new Map<string, Mesh>();
  shaders = new Map<ShaderID, program>();

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

  create_mesh(name: string, factory: (gl: WebGL2RenderingContext) => Mesh) {
    const mesh = factory(this.gl);
    this.meshes.set(name, mesh);

    return name;
  }

  create_shader(
    fragment_shader: string,
    vertex_shader: string,
    factory: (gl: WebGL2RenderingContext, shader: WebGLProgram) => program
  ) {
    const shader = factory(
      this.gl,
      t.program(this.gl, [
        t.shader(this.gl, fragment_shader, "FRAGMENT"),
        t.shader(this.gl, vertex_shader, "VERTEX"),
      ])
    );

    this.shaders.set(shader.id, shader);

    return shader.id;
  }
}
