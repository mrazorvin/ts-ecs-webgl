import { InitComponent } from "../ecs/World";
import { SpriteMesh } from "./Assets/View/Sprite/Sprite.mesh";
import { SpriteShader } from "./Assets/View/Sprite/Sprite.shader";
import { MeshID } from "./Render/Mesh";
import { Shader, ShaderID } from "./Render/Shader";
import { TextureID } from "./Render/Texture";
import { WebGL } from "./Render/WebGL";

export class Sprite extends InitComponent() {
  constructor(
    public shader: ShaderID,
    public mesh: MeshID,
    public texture: TextureID
  ) {
    super();
  }

  static render(
    ctx: WebGL,
    sprite: Sprite,
    transform: Float32Array,
    frame_x: number,
    frame_y: number
  ) {
    const shader = ctx.shaders.get(sprite.shader);
    const mesh = ctx.meshes.get(sprite.mesh);
    const texture = ctx.textures.get(sprite.texture);

    if (
      mesh instanceof SpriteMesh &&
      shader instanceof SpriteShader &&
      texture
    ) {
      const gl = ctx.gl;

      gl.useProgram(shader.program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture.texture);
      gl.uniform1i(shader.location.Image, 0);
      gl.uniform2f(
        shader.location.Frame,
        frame_x * mesh.uv_width,
        frame_y * mesh.uv_height
      );
      gl.uniformMatrix3fv(shader.location.Transform, false, transform);
      Shader.render_mesh(gl, mesh);
      gl.useProgram(null);
    } else {
      throw new Error(`[Sprite -> render()] resource resolving problem`);
    }
  }
}
