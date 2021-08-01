import { sys } from "@mr/ecs/World";
import { WebGL } from "../../Render/WebGL";
import * as tiled_map from "./tiled_map.json";
import * as tiles_properties from "./ground_atlased.json";
import { Texture, TextureID } from "../../Render/Texture";
import { SpriteMesh } from "../View/Sprite/Sprite.mesh";
import { Transform } from "../../Transform/Transform";
import { Static } from "../../Static";
import { Sprite } from "../../Sprite";
import { SPRITE_SHADER } from "../View/Sprite/Sprite.shader";

// @ts-expect-error
import * as ground_sprite from "url:./ground_tiled.png";
import { camera_entity } from "../../Camera";
import { CollisionWorld } from "../../CollisionWorld";
import { SSCDRectangle, SSCDVector } from "@mr/sscd";
import { SpriteInstancingMesh } from "../View/SpriteInstancing/SpriteInstancing.mesh";
import { SpriteInstancingShader } from "../View/SpriteInstancing/SpriteInstancing.shader";
import { t } from "../../Render/WebGLUtils";

const query = <T extends any[]>(args: [...T]) => args;
const Query = query([WebGL, CollisionWorld]);

export let map_mesh: SpriteInstancingMesh = undefined as any;
export let map_shader: SpriteInstancingShader = undefined as any;
export let map_texture: TextureID = undefined as any;

export const MapLoader = sys(Query, async (world, ctx, sscd) => {
  const ground_image = await Texture.load_image(ground_sprite);
  const bg_texture = ctx.create_texture(ground_image, Texture.create);
  const tile_mesh = ctx.create_mesh((gl) =>
    SpriteMesh.create_rect(gl, {
      o_width: ground_image.width,
      o_height: ground_image.height,
      width: 32,
      height: 32,
    })
  );

  map_texture = bg_texture;

  map_mesh = SpriteInstancingMesh.create_rect(ctx.gl, {
    o_width: ground_image.width,
    o_height: ground_image.height,
    width: 32,
    height: 32,
  });

  map_shader = SpriteInstancingShader.create(
    ctx.gl,
    t.program(ctx.gl, [
      t.shader(ctx.gl, SpriteInstancingShader.fragment_shader, "FRAGMENT"),
      t.shader(ctx.gl, SpriteInstancingShader.vertex_shader, "VERTEX"),
    ])
  );

  // this code must be generic and use less constants
  const rows_amount = tiled_map.height;
  const columns_amount = tiled_map.width;
  const layer = tiled_map.layers[0]!.data;
  for (let row = 0; row < rows_amount; row++) {
    for (let column = 0; column < columns_amount; column++) {
      const tile_id = row * columns_amount + column;
      const frame = layer[tile_id]! - 1;
      const meta = tiles_properties.regions[frame]!;

      // TODO: find a better API to connect transform with CollisionWorld
      const transform = new Transform({
        width: 32,
        height: 32,
        position: new Float32Array([column * 32, row * 32]),
        parent: camera_entity.ref,
      });

      // TOOD: prettu ugle that we need to use transform in such way
      const entity = world.entity([
        new Sprite(SPRITE_SHADER, tile_mesh, bg_texture),
        transform,
        new Static(meta.rect[0]! / tiles_properties.grid_width, meta.rect[1]! / tiles_properties.grid_height),
      ]);

      const shape = sscd.attach(
        entity.ref,
        new SSCDRectangle(
          new SSCDVector(transform.position![0]! + transform.width / 2, transform.position![1]! + transform.width / 2),
          new SSCDVector(transform.width, transform.width)
        )
      );

      // attach component is slow, add a method that will create attach function
      // or something similar for such bulk operation
      world.attach_component(entity, shape);
    }
  }
});
