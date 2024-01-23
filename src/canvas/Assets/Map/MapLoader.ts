import { sys } from "@mr/ecs/World";
import { WebGL } from "../../Render/WebGL";
import * as tiled_map from "./tiled_map.json";
import * as tiles_properties from "./ground_atlased.json";
import { Texture } from "../../Render/Texture";
import { BaseTransform, Transform } from "../../Transform/Transform";
import { Sprite } from "../../Sprite";
import { SPRITE_SHADER } from "../View/Sprite/Sprite.shader";

// @ts-expect-error
import * as ground_sprite from "url:./ground_tiled.png";
import { CollisionShape, CollisionWorld } from "../../CollisionWorld";
import { SSCDRectangle, SSCDVector } from "@mr/sscd";
import { static_comp } from "../../Static";
import { TerrainLayer } from "../../Layers";

const query = <T extends any[]>(args: [...T]) => args;
const Query = query([WebGL, CollisionWorld]);

export const MapLoader = sys(Query, async (world, ctx, sscd) => {
  const ground_image = await Texture.load_image(ground_sprite);
  const bg_texture = ctx.create_texture(Texture.create, ground_image, {}).id;

  // this code must be generic and use less constants
  const rows_amount = tiled_map.height;
  const columns_amount = tiled_map.width;
  const layer = tiled_map.layers[0]!.data;
  const shape_manager = CollisionShape.manager(world);
  for (let row = 0; row < rows_amount; row++) {
    for (let column = 0; column < columns_amount; column++) {
      const tile_id = row * columns_amount + column;
      const frame = layer[tile_id]! - 1;
      const meta = tiles_properties.regions[frame]!;

      // TODO: find a better API to connect transform with CollisionWorld
      const transform = Transform.create(world, {
        width: 32,
        height: 32,
        x: column * 32,
        y: row * 32,
        parent: BaseTransform.Camera,
      });

      // TOOD: prettu ugle that we need to use transform in such way
      const entity = world.entity([
        Sprite.create(
          world,
          SPRITE_SHADER,
          bg_texture,
          {
            uv_width: 32 / ground_image.width,
            uv_height: 32 / ground_image.height,
            x: meta.rect[0]! / tiles_properties.grid_width,
            y: meta.rect[1]! / tiles_properties.grid_height,
          },
          TerrainLayer,
        ),
        transform,
        static_comp,
      ]);

      const shape = sscd.attach(
        world,
        entity.ref,
        new SSCDRectangle(
          new SSCDVector(transform.x + transform.width / 2, transform.y + transform.width / 2),
          new SSCDVector(transform.width, transform.width),
        ),
      );

      // attach component is slow, add a method that will create attach function
      // or something similar for such bulk operation
      shape_manager.attach(entity, shape);
    }
  }
});
