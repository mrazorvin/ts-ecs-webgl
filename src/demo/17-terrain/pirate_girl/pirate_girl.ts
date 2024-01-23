import { Texture } from "src/canvas/Render/Texture";
// @ts-expect-error
import * as pirate_girl_obj from "bundle-text:./pirate_girl.obj";
// @ts-expect-error
import * as pirate_girl_png from "url:./pirate_girl.png";

export const pirate_girl = {
  obj: pirate_girl_obj as string,
  image: Texture.load_image(pirate_girl_png),
};
