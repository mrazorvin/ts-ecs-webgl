import { ComponentFactory } from "@mr/ecs/Component";
import { InitComponent } from "../ecs/World";
import { SpriteMesh } from "./Assets/View/Sprite/Sprite.mesh";
import { SpriteShader } from "./Assets/View/Sprite/Sprite.shader";
import { MeshID } from "./Render/Mesh";
import { ShaderID } from "./Render/Shader";
import { TextureID } from "./Render/Texture";
import { WebGL } from "./Render/WebGL";

export class Sprite extends InitComponent({ use_pool: 20 }) {
  static create = ComponentFactory(Sprite, (prev, shader, mesh, texture) => {
    if (prev !== undefined) {
      prev.shader = shader;
      prev.mesh = mesh;
      prev.texture = texture;

      return prev;
    }

    return new Sprite(shader, mesh, texture);
  });

  constructor(public shader: ShaderID, public mesh: MeshID, public texture: TextureID) {
    super();
  }

  static render(
    ctx: WebGL,
    sprite: Sprite,
    transform_buffer: Float32Array,
    frame_buffer: Float32Array,
    amount: number
  ) {
    const shader = ctx.shaders.get(sprite.shader);
    const mesh = ctx.meshes.get(sprite.mesh);
    const texture = ctx.textures.get(sprite.texture);

    if (mesh instanceof SpriteMesh && shader instanceof SpriteShader && texture) {
      const gl = ctx.gl;

      gl.useProgram(shader.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture.texture);
      gl.uniform1i(shader.location.Image, 0);
      gl.bindVertexArray(mesh.vao);

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.transform_buffer);
      gl.bufferData(gl.ARRAY_BUFFER, transform_buffer, gl.DYNAMIC_DRAW);

      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.frame_buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, frame_buffer);

      gl.drawArraysInstanced(
        gl.TRIANGLE_STRIP,
        0, // offset
        6, // num vertices per instance
        amount // num instances
      );
      gl.bindVertexArray(null);
      gl.useProgram(null);
    } else {
      throw new Error(`[Sprite -> render()] resource resolving problem`);
    }
  }
}
