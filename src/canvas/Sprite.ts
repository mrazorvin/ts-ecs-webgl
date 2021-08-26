import { ComponentFactory } from "@mr/ecs/Component";
import { InitComponent } from "../ecs/World";
import { SpriteMesh, SPRITE_MESH } from "./Assets/View/Sprite/Sprite.mesh";
import { SpriteShader } from "./Assets/View/Sprite/Sprite.shader";
import { ShaderID } from "./Render/Shader";
import { TextureID } from "./Render/Texture";
import { WebGL } from "./Render/WebGL";

export class Sprite extends InitComponent({ use_pool: 20 }) {
  static create = ComponentFactory(Sprite, (prev, shader, texture, uv, layer) => {
    if (prev !== undefined) {
      prev.shader = shader;
      prev.texture = texture;
      prev.frame = uv;
      prev.layer = layer;

      return prev;
    }

    return new Sprite(shader, texture, uv, layer);
  });

  constructor(
    public shader: ShaderID,
    public texture: TextureID,
    public frame: { uv_width: number; uv_height: number; x: number; y: number },
    public layer: number
  ) {
    super();
  }

  static render(
    ctx: WebGL,
    sprite: Sprite,
    transform_buffer: Float32Array,
    sprite_buffer: Float32Array,
    amount: number
  ) {
    const shader = ctx.shaders.get(sprite.shader);
    const mesh = ctx.meshes.get(SPRITE_MESH);
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
      gl.bufferData(gl.ARRAY_BUFFER, sprite_buffer, gl.DYNAMIC_DRAW);

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
