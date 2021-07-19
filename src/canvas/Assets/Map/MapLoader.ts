import { sys } from "@mr/ecs/World";
import { WebGL } from "../../Render/WebGL";
import * as tiled_map from "./tiled_map.json";
import * as tiles_properties from "./ground_atlased.json";
import { Texture } from "../../Render/Texture";
import { SpriteMesh } from "../View/Sprite/Sprite.mesh";
import { Transform } from "../../Transform/Transform";
import { Static } from "../../Static";
import { Sprite } from "../../Sprite";
import { SPRITE_SHADER } from "../View/Sprite/Sprite.shader";

// @ts-expect-error
import * as ground_sprite from "url:./ground_tiled.png";
import { camera_entity } from "../../Camera";

export const MapLoader = sys([WebGL], async (world, ctx) => {
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

  const rows_amount = tiled_map.height;
  const columns_amount = tiled_map.width;
  const layer = tiled_map.layers[0].data;
  for (let row = 0; row < rows_amount; row++) {
    for (let column = 0; column < columns_amount; column++) {
      const tile_id = row * columns_amount + column;
      const frame = layer[tile_id] - 1;
      const meta = tiles_properties.regions[frame];

      const data = world.origin_world.entity([
        new Sprite(SPRITE_SHADER, tile_mesh, bg_texture),
        new Transform({
          width: 32,
          height: 32,
          position: new Float32Array([column * 32, row * 32]),
          parent: camera_entity.ref,
        }),
        new Static(
          meta.rect[0] / tiles_properties.grid_width,
          meta.rect[1] / tiles_properties.grid_height
        ),
      ]);
    }
  }
});
